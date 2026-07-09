interface Word {
  text: string
  start: number
  end: number
  confidence: number
  punctuated: string
}

export interface TranscriptSegment {
  id: string
  text: string
  is_final: boolean
  confidence: number
  words: Word[]
  timestamp: number
}
