export interface DeviceInfo {
  id: string
  name: string
  sample_rate: number
  channels: number
  is_default: boolean
}

export interface AudioLevel {
  rms: number
  peak: number
}
