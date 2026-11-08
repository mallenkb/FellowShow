"""Bridge installed speech engines to FellowShow's PCM and transcript streams."""

import json
import os
from pathlib import Path
import shutil
import sys
import urllib.request

SAMPLE_RATE = 16_000
FRAME_SAMPLES = SAMPLE_RATE // 10
# Reserve the original stdout pipe for the protocol. Native libraries also
# write to stdout, so redirect at the descriptor level before importing them.
WIRE = os.fdopen(os.dup(sys.stdout.fileno()), "w", encoding="utf-8")
os.dup2(sys.stderr.fileno(), sys.stdout.fileno())
SHERPA_ASSETS = {
    "nemotron": (
        "csukuangfj2/sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-560ms-int8-2026-06-11",
        "ab43d895f5985b1bbab8b6eac8607fcdc05343f3",
        "{part}.int8.onnx",
    ),
    "zipformer": (
        "csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-06-26",
        "672fbf1b30579d6585301139bb363f42a0ad4a24",
        "{part}-epoch-99-avg-1-chunk-16-left-64.int8.onnx",
    ),
    "parakeet": (
        "csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8",
        "ed5d745623472f97cfc2e6c2916ee248798fc5a8",
        "{part}.int8.onnx",
    ),
}


def emit(kind, text="", start=0.0):
    if kind in ("partial", "final") and not text.strip():
        return
    print(json.dumps({"type": kind, "text": text.strip(), "start": start}), file=WIRE, flush=True)


def audio_frames():
    import numpy as np

    while raw := sys.stdin.buffer.read(2 * FRAME_SAMPLES):
        yield np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0


def download_file(url, path):
    if path.is_file():
        return
    pending = path.with_suffix(path.suffix + ".part")
    with urllib.request.urlopen(url, timeout=60) as source, pending.open("wb") as dest:
        shutil.copyfileobj(source, dest)
        expected = source.headers.get("Content-Length")
        if expected is not None and dest.tell() != int(expected):
            raise OSError(f"Incomplete download of {path.name}")
    pending.replace(path)


def load_sherpa(model, root, download):
    import sherpa_onnx

    repo, revision, filename = SHERPA_ASSETS[model]
    weights = root / "weights"
    files = {part: filename.format(part=part) for part in ("encoder", "decoder", "joiner")}
    files["tokens"] = "tokens.txt"
    if download:
        weights.mkdir(exist_ok=True)
        names = list(files.values())
        if model == "zipformer":
            names.append("bpe.model")
        for name in names:
            download_file(f"https://huggingface.co/{repo}/resolve/{revision}/{name}", weights / name)

    threads = min(4, max(1, (os.cpu_count() or 2) // 2))
    config = {key: str(weights / name) for key, name in files.items()}
    if model == "parakeet":
        return sherpa_onnx.OfflineRecognizer.from_transducer(
            **config, num_threads=threads, model_type="nemo_transducer"
        )

    options = {}
    if model == "zipformer":
        vocab = weights / "bpe.vocab"
        if download:
            from sentencepiece import SentencePieceProcessor

            tokenizer = SentencePieceProcessor(model_file=str(weights / "bpe.model"))
            vocab.write_text(
                "".join(
                    f"{tokenizer.id_to_piece(i)}\t{tokenizer.get_score(i)}\n"
                    for i in range(tokenizer.get_piece_size())
                ),
                encoding="utf-8",
            )
        options = {
            "decoding_method": "modified_beam_search",
            "hotwords_file": str(root / "bible-keyterms.txt"),
            "hotwords_score": 1.1,
            "modeling_unit": "bpe",
            "bpe_vocab": str(vocab),
        }
    return sherpa_onnx.OnlineRecognizer.from_transducer(
        **config, **options, num_threads=threads, sample_rate=SAMPLE_RATE,
        enable_endpoint_detection=True,
    )


def online_stream(recognizer, frames):
    import numpy as np

    stream = recognizer.create_stream()
    total_samples = 0
    start = 0
    previous = ""
    for samples in frames:
        total_samples += len(samples)
        stream.accept_waveform(SAMPLE_RATE, samples)
        while recognizer.is_ready(stream):
            recognizer.decode_stream(stream)
        text = recognizer.get_result(stream)
        if recognizer.is_endpoint(stream):
            emit("final", text, start / SAMPLE_RATE)
            recognizer.reset(stream)
            previous = ""
            start = total_samples
        elif text != previous:
            emit("partial", text)
            previous = text

    stream.accept_waveform(SAMPLE_RATE, np.zeros(SAMPLE_RATE, dtype=np.float32))
    stream.input_finished()
    while recognizer.is_ready(stream):
        recognizer.decode_stream(stream)
    emit("final", recognizer.get_result(stream), start / SAMPLE_RATE)


def load_moonshine(root, download):
    from moonshine_voice import ModelArch, Transcriber, get_model_for_language

    arch = ModelArch.MEDIUM_STREAMING
    marker = root / "moonshine-path"
    if download:
        path, arch = get_model_for_language("en", arch, cache_root=root / "moonshine")
        marker.write_text(str(Path(path).relative_to(root)), encoding="utf-8")
    else:
        path = root / marker.read_text(encoding="utf-8")
    return Transcriber(model_path=path, model_arch=arch)


def moonshine_stream(transcriber, frames):
    from moonshine_voice import TranscriptEventListener

    class Listener(TranscriptEventListener):
        def on_line_text_changed(self, event):
            emit("partial", event.line.text)

        def on_line_completed(self, event):
            emit("final", event.line.text, event.line.start_time)

        def on_error(self, event):
            emit("error", str(event))

    with transcriber:
        transcriber.add_listener(Listener())
        transcriber.start()
        for samples in frames:
            transcriber.add_audio(samples.tolist(), SAMPLE_RATE)
        transcriber.stop()


def load_voxtral(root, download):
    from mlx_audio.stt.utils import load

    weights = root / "weights"
    if download:
        from huggingface_hub import snapshot_download

        snapshot_download(
            "mlx-community/Voxtral-Mini-4B-Realtime-2602-4bit",
            revision="fdebf7b2af834a1db4b8a3c99ab7480b333adf9e",
            local_dir=weights,
            allow_patterns=["*.json", "*.safetensors"],
        )
    return load(str(weights))


def utterances(frames, max_seconds):
    """Group audio into bounded turns for the engines without endpoint detection."""
    import numpy as np

    silence = 0
    duration = 0
    offset = 0
    for samples in frames:
        quiet = np.sqrt(np.mean(samples * samples)) < 0.008
        if quiet and duration == 0:
            offset += len(samples)
            continue
        duration += len(samples)
        silence = silence + len(samples) if quiet else 0
        finished = silence >= SAMPLE_RATE * 0.6 or duration >= SAMPLE_RATE * max_seconds
        yield samples, offset / SAMPLE_RATE, finished
        if finished:
            offset += duration
            duration = silence = 0


def parakeet_stream(recognizer, frames):
    import numpy as np

    def transcribe(parts, start):
        stream = recognizer.create_stream()
        stream.accept_waveform(SAMPLE_RATE, np.concatenate(parts))
        recognizer.decode_stream(stream)
        emit("final", stream.result.text, start)

    parts = []
    start = 0.0
    for samples, start, finished in utterances(frames, max_seconds=8):
        parts.append(samples)
        if finished:
            transcribe(parts, start)
            parts.clear()
    if parts:
        transcribe(parts, start)


def voxtral_stream(model, frames):
    def finish(session, text, start):
        session.close()
        while not session.done:
            text += "".join(session.step(max_decode_tokens=16))
        emit("final", text, start)

    session = None
    text = ""
    start = 0.0
    for samples, start, finished in utterances(frames, max_seconds=12):
        if session is None:
            session = model.create_streaming_session(transcription_delay_ms=480)
            text = ""
        session.feed(samples)
        delta = "".join(session.step(max_decode_tokens=8))
        if delta:
            text += delta
            emit("partial", text)
        if finished or session.done:
            finish(session, text, start)
            session = None
    if session is not None:
        finish(session, text, start)


def main(model, action, directory):
    root = Path(directory)
    download = action == "download"
    if model == "moonshine":
        engine = load_moonshine(root, download)
        run = moonshine_stream
    elif model == "voxtral":
        engine = load_voxtral(root, download)
        run = voxtral_stream
    else:
        engine = load_sherpa(model, root, download)
        run = parakeet_stream if model == "parakeet" else online_stream
    emit("ready")
    if not download:
        run(engine, audio_frames())


if __name__ == "__main__":
    try:
        main(*sys.argv[1:])
    except Exception as error:
        emit("error", str(error))
        sys.exit(1)
