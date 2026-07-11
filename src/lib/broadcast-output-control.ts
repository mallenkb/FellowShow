export type OutputType = "display" | "ndi"
export type OutputActivation = "open-display" | "start-ndi" | "stop-all"

export function getOutputActivation(
  enabled: boolean,
  outputType: OutputType
): OutputActivation {
  if (!enabled) return "stop-all"
  return outputType === "display" ? "open-display" : "start-ndi"
}

export function selectPreferredMonitorIndex(
  monitors: Array<{ isPrimary: boolean }>
): number {
  const externalIndex = monitors.findIndex((monitor) => !monitor.isPrimary)
  return externalIndex >= 0 ? externalIndex : 0
}
