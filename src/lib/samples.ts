/**
 * Built-in sample images that ship with the app. All images are CC0 1.0
 * Universal Public Domain Dedication, sourced from Wikimedia Commons /
 * Unsplash. Attribution is in public/samples/ and the project README.
 */
export interface SampleImage {
  id: string
  fileName: string
  label: string
  description: string
  suggestedQuery: string
}

export const SAMPLES: SampleImage[] = [
  {
    id: 'laptop-desk',
    fileName: 'laptop-desk.jpg',
    label: 'Desk',
    description: 'A laptop, mug and notepad on a desk',
    suggestedQuery: 'laptop',
  },
  {
    id: 'car-license-plate',
    fileName: 'car-license-plate.jpg',
    label: 'Car',
    description: 'A vintage car with a visible license plate',
    suggestedQuery: 'license plate',
  },
  {
    id: 'face-portrait',
    fileName: 'face-portrait.jpg',
    label: 'Portrait',
    description: 'A close-up portrait of a person',
    suggestedQuery: 'face',
  },
  {
    id: 'smartphone-screen',
    fileName: 'smartphone-screen.jpg',
    label: 'Phone',
    description: 'A hand holding a smartphone with a screen',
    suggestedQuery: 'phone',
  },
]

export function sampleUrl(sample: SampleImage): string {
  return `${import.meta.env.BASE_URL}samples/${sample.fileName}`
}
