import { useEffect, useState } from "react"

const SAMPLE_MS = 70

/**
 * The last `bars` peak levels (0..1) of the stream's audio, newest last,
 * sampled every 70 ms. All zeros when there is no audio track.
 */
export function useAudioWave(stream: MediaStream | null, bars: number) {
  const [wave, setWave] = useState<number[]>(() =>
    new Array<number>(bars).fill(0)
  )
  const audioTrack = stream?.getAudioTracks()[0] ?? null

  useEffect(() => {
    if (!stream || !audioTrack || typeof AudioContext === "undefined") return
    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)

    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples)
      let peak = 0
      for (const sample of samples) {
        const value = Math.abs(sample)
        if (value > peak) peak = value
      }
      setWave((previous) => [...previous.slice(1 - bars), Math.min(1, peak)])
    }, SAMPLE_MS)

    return () => {
      window.clearInterval(timer)
      source.disconnect()
      void context.close().catch(() => undefined)
      setWave(new Array<number>(bars).fill(0))
    }
  }, [stream, audioTrack, bars])

  return audioTrack ? wave : null
}
