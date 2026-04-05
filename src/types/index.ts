export interface Point {
  x: number
  y: number
}

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export type SelectionMode = 'rectangle' | 'freeform' | 'detect'

export interface RectangleSelection {
  type: 'rectangle'
  region: Region
}

export interface FreeformSelection {
  type: 'freeform'
  points: Point[]
}

export type Selection = RectangleSelection | FreeformSelection

export interface BlurSettings {
  radius: number
  sigma: number
}

export interface DetectedObject {
  class: string
  score: number
  bbox: [number, number, number, number] // [x, y, width, height]
}
