export function getBroadcastContextMenuLabel(isFullscreen: boolean): string {
  return isFullscreen ? "Exit full screen" : "Enter full screen"
}

export function getBroadcastContextMenuPosition(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
  menuWidth = 180,
  menuHeight = 44,
  margin = 8
): { x: number; y: number } {
  return {
    x: Math.max(margin, Math.min(clientX, viewportWidth - menuWidth - margin)),
    y: Math.max(
      margin,
      Math.min(clientY, viewportHeight - menuHeight - margin)
    ),
  }
}
