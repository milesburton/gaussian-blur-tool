import type { DetectedObject } from '@/types'

type Detector = (
  image: string,
  labels: string[],
  options: { threshold: number; top_k: number }
) => Promise<
  {
    score: number
    label: string
    box: { xmin: number; ymin: number; xmax: number; ymax: number }
  }[]
>

let detectorPromise: Promise<Detector> | null = null

async function getDetector(): Promise<Detector> {
  if (!detectorPromise) {
    detectorPromise = import('@huggingface/transformers').then(async ({ pipeline }) => {
      const detector = await pipeline(
        'zero-shot-object-detection',
        'Xenova/owlv2-base-patch16-ensemble',
        {
          dtype: 'q4',
        }
      )
      return detector as unknown as Detector
    })
  }
  return detectorPromise
}

function imageToDataUrl(image: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas context')
  ctx.drawImage(image, 0, 0)
  return canvas.toDataURL('image/png')
}

export async function detectObjects(
  image: HTMLImageElement,
  query: string
): Promise<DetectedObject[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const detector = await getDetector()
  const dataUrl = imageToDataUrl(image)

  const labels = trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const results = await detector(dataUrl, labels, {
    threshold: 0.05,
    top_k: 20,
  })

  return results.map((r) => ({
    class: r.label,
    score: r.score,
    bbox: [r.box.xmin, r.box.ymin, r.box.xmax - r.box.xmin, r.box.ymax - r.box.ymin],
  }))
}
