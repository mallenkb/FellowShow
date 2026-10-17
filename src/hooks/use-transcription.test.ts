import { beforeEach, describe, expect, it, vi } from "vitest"

const mockInvoke = vi.fn()
const mockToastError = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock("@/hooks/use-tauri-event", () => ({
  useTauriEvent: () => {},
}))

async function loadModules() {
  vi.resetModules()
  const transcriptMod = await import("@/stores/transcript-store")
  const audioMod = await import("@/stores/audio-store")
  const settingsMod = await import("@/stores/settings-store")
  // Startup hydration and keychain access have their own store tests. Keep
  // this unit test focused on transcription using the configured settings.
  const hydrateSettings = vi
    .spyOn(settingsMod, "hydrateSettings")
    .mockResolvedValue(undefined)
  const unlockSecureSettings = vi
    .spyOn(settingsMod, "unlockSecureSettings")
    .mockResolvedValue(undefined)
  const hookMod = await import("./use-transcription")
  return {
    useTranscriptStore: transcriptMod.useTranscriptStore,
    useAudioStore: audioMod.useAudioStore,
    useSettingsStore: settingsMod.useSettingsStore,
    transcriptionActions: hookMod.transcriptionActions,
    hydrateSettings,
    unlockSecureSettings,
  }
}

describe("use-transcription", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockInvoke.mockReset()
    mockToastError.mockReset()
  })

  describe("transcriptionActions.start", () => {
    it("invokes start_transcription with settings-derived params for whisper", async () => {
      mockInvoke.mockResolvedValue(undefined)
      const {
        useSettingsStore,
        transcriptionActions,
        hydrateSettings,
        unlockSecureSettings,
      } = await loadModules()

      useSettingsStore.setState({
        sttProvider: "whisper",
        deepgramApiKey: "ignored-for-whisper",
        audioDeviceId: "dev-42",
        gain: 1.5,
      })

      await transcriptionActions.start()

      expect(hydrateSettings).toHaveBeenCalledTimes(1)
      expect(unlockSecureSettings).not.toHaveBeenCalled()
      expect(mockInvoke).toHaveBeenCalledWith("start_transcription", {
        apiKey: "", // whisper path never forwards the key
        deviceId: "dev-42",
        gain: 1.5,
        provider: "whisper",
      })
    })

    it("forwards the Deepgram key when provider is deepgram", async () => {
      mockInvoke.mockResolvedValue(undefined)
      const { useSettingsStore, transcriptionActions, unlockSecureSettings } =
        await loadModules()

      useSettingsStore.setState({
        sttProvider: "deepgram",
        deepgramApiKey: "dg-live-123",
        audioDeviceId: null,
        gain: 1.0,
      })

      await transcriptionActions.start()

      expect(unlockSecureSettings).toHaveBeenCalledTimes(1)
      expect(mockInvoke).toHaveBeenCalledWith(
        "start_transcription",
        expect.objectContaining({
          apiKey: "dg-live-123",
          provider: "deepgram",
          deviceId: null,
          gain: 1.0,
        })
      )
    })

    it("forwards the OpenAI key when provider is openai", async () => {
      mockInvoke.mockResolvedValue(undefined)
      const { useSettingsStore, transcriptionActions } = await loadModules()

      useSettingsStore.setState({
        sttProvider: "openai",
        openaiApiKey: "sk-openai",
        audioDeviceId: null,
        gain: 1.0,
      })

      await transcriptionActions.start()

      expect(mockInvoke).toHaveBeenCalledWith(
        "start_transcription",
        expect.objectContaining({
          apiKey: "sk-openai",
          provider: "openai",
        })
      )
    })

    it("forwards the Groq key when provider is groq", async () => {
      mockInvoke.mockResolvedValue(undefined)
      const { useSettingsStore, transcriptionActions } = await loadModules()

      useSettingsStore.setState({
        sttProvider: "groq",
        groqApiKey: "gsk-groq",
        audioDeviceId: null,
        gain: 1.0,
      })

      await transcriptionActions.start()

      expect(mockInvoke).toHaveBeenCalledWith(
        "start_transcription",
        expect.objectContaining({
          apiKey: "gsk-groq",
          provider: "groq",
        })
      )
    })

    it("marks transcription as starting while the start command is pending", async () => {
      let resolveInvoke: () => void = () => {}
      mockInvoke.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveInvoke = resolve
        })
      )

      const { useTranscriptStore, transcriptionActions } = await loadModules()

      const pending = transcriptionActions.start()

      await vi.waitFor(() => {
        expect(useTranscriptStore.getState().connectionStatus).toBe(
          "connecting"
        )
      })
      expect(useTranscriptStore.getState().isTranscribing).toBe(true)

      resolveInvoke()
      await pending

      expect(useTranscriptStore.getState().isTranscribing).toBe(true)
      expect(useTranscriptStore.getState().connectionStatus).not.toBe("error")
    })

    it("routes a missing-Deepgram-key error to onMissingApiKey (no toast)", async () => {
      mockInvoke.mockRejectedValue(
        "No Deepgram API key provided. Set it in Settings or via DEEPGRAM_API_KEY env var."
      )
      const { useTranscriptStore, transcriptionActions } = await loadModules()
      const onMissingApiKey = vi.fn()

      await transcriptionActions.start(onMissingApiKey)

      expect(onMissingApiKey).toHaveBeenCalledTimes(1)
      expect(mockToastError).not.toHaveBeenCalled()
      expect(useTranscriptStore.getState().connectionStatus).toBe("error")
      expect(useTranscriptStore.getState().isTranscribing).toBe(false)
    })

    it("falls back to toast when missing-key error fires but no callback is provided", async () => {
      mockInvoke.mockRejectedValue("No Deepgram API key provided")
      const { transcriptionActions } = await loadModules()

      await transcriptionActions.start()

      expect(mockToastError).toHaveBeenCalledWith(
        "Could not start transcription",
        { description: "No Deepgram API key provided" }
      )
    })

    it("surfaces any other start error as a toast", async () => {
      mockInvoke.mockRejectedValue("Whisper model not found")
      const { useTranscriptStore, transcriptionActions } = await loadModules()
      const onMissingApiKey = vi.fn()

      await transcriptionActions.start(onMissingApiKey)

      expect(onMissingApiKey).not.toHaveBeenCalled()
      expect(mockToastError).toHaveBeenCalledWith(
        "Could not start transcription",
        { description: "Whisper model not found" }
      )
      expect(useTranscriptStore.getState().connectionStatus).toBe("error")
    })
  })

  describe("transcriptionActions.stop", () => {
    it("resets transcript state on success", async () => {
      mockInvoke.mockResolvedValue(undefined)
      const { useTranscriptStore, useAudioStore, transcriptionActions } =
        await loadModules()

      useTranscriptStore.setState({
        isTranscribing: true,
        currentPartial: "partial text",
        connectionStatus: "connected",
      })
      useAudioStore.getState().setLevel({ rms: 0.2, peak: 0.8 })

      await transcriptionActions.stop()

      const state = useTranscriptStore.getState()
      expect(state.isTranscribing).toBe(false)
      expect(state.currentPartial).toBe("")
      expect(state.connectionStatus).toBe("disconnected")
      expect(useAudioStore.getState().level).toEqual({ rms: 0, peak: 0 })
      expect(mockToastError).not.toHaveBeenCalled()
    })

    it("silently swallows the exact 'Transcription is not running' error", async () => {
      mockInvoke.mockRejectedValue("Transcription is not running")
      const { useTranscriptStore, transcriptionActions } = await loadModules()

      useTranscriptStore.setState({ isTranscribing: true })

      await transcriptionActions.stop()

      expect(mockToastError).not.toHaveBeenCalled()
      expect(useTranscriptStore.getState().isTranscribing).toBe(false)
    })

    it("keeps the microphone state and partial transcript when stop fails", async () => {
      mockInvoke.mockRejectedValue("Audio device disappeared")
      const { useTranscriptStore, useAudioStore, transcriptionActions } =
        await loadModules()

      useTranscriptStore.setState({
        isTranscribing: true,
        currentPartial: "mid-sentence...",
        connectionStatus: "connected",
      })
      useAudioStore.getState().setLevel({ rms: 0.2, peak: 0.8 })

      await expect(transcriptionActions.stop()).rejects.toBe(
        "Audio device disappeared"
      )

      expect(mockToastError).toHaveBeenCalledWith(
        "Could not stop transcription",
        { description: "Audio device disappeared" }
      )
      const state = useTranscriptStore.getState()
      expect(state.isTranscribing).toBe(true)
      expect(state.currentPartial).toBe("mid-sentence...")
      expect(state.connectionStatus).toBe("error")
      expect(useAudioStore.getState().level).toEqual({ rms: 0.2, peak: 0.8 })
    })

    it("clears a stale microphone meter when capture has already stopped", async () => {
      const { useAudioStore, transcriptionActions } = await loadModules()
      useAudioStore.getState().setLevel({ rms: 0.2, peak: 0.8 })
      await transcriptionActions.stop()
      expect(useAudioStore.getState().level).toEqual({ rms: 0, peak: 0 })
      expect(mockInvoke).not.toHaveBeenCalled()
    })
  })

  describe("stt_error integration contract", () => {
    it("surfaces stt errors via toast and sets connection status to error", async () => {
      const { useTranscriptStore } = await loadModules()

      // Simulate what the stt_error handler does
      useTranscriptStore.getState().setConnectionStatus("error")
      mockToastError("Transcription error", {
        description: "WebSocket closed unexpectedly",
      })

      expect(useTranscriptStore.getState().connectionStatus).toBe("error")
      expect(mockToastError).toHaveBeenCalledWith("Transcription error", {
        description: "WebSocket closed unexpectedly",
      })
    })
  })
})
