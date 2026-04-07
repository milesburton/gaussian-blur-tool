import type { DetectedObject } from '@/types'

type RawImageInput = {
  width: number
  height: number
}

type Detector = (
  image: RawImageInput,
  labels: string[],
  options: { threshold: number; topk: number }
) => Promise<
  {
    score: number
    label: string
    box: { xmin: number; ymin: number; xmax: number; ymax: number }
  }[]
>

let detectorPromise: Promise<{
  detector: Detector
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import type
  RawImage: any
}> | null = null

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = import('@huggingface/transformers').then(async ({ pipeline, RawImage }) => {
      // OWLv2 q4f16: ~128MB, cached in browser after first load.
      // Note: pinned to @huggingface/transformers ^3.8.1 — the v4 line ships
      // with an onnxruntime-web build that fails to resolve Cast(13) ops in
      // every quant variant of OWLv2 / OWL-ViT.
      const detector = await pipeline(
        'zero-shot-object-detection',
        'Xenova/owlv2-base-patch16-ensemble',
        { dtype: 'q4f16' }
      )
      return { detector: detector as unknown as Detector, RawImage }
    })
  }
  return detectorPromise
}

/**
 * OWLv2 was trained with descriptive prompts. Single nouns (e.g. "laptop")
 * give significantly worse recall than "a photo of a laptop". This wraps
 * raw user labels into the canonical OWL-ViT/OWLv2 template, lowercased.
 */
function templateLabel(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return trimmed
  // If the user already wrote a phrase, leave it alone
  if (trimmed.startsWith('a ') || trimmed.startsWith('an ') || trimmed.startsWith('the ')) {
    return trimmed
  }
  if (trimmed.includes(' ')) return trimmed
  return `a photo of a ${trimmed}`
}

export async function detectObjects(
  source: HTMLImageElement | Blob,
  query: string
): Promise<DetectedObject[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const { detector, RawImage } = await getDetector()

  // RawImage.fromBlob is the recommended path — it bypasses canvas
  // colour-space quirks and matches what the pipeline does internally.
  let rawImage: RawImageInput
  if (source instanceof Blob) {
    rawImage = await RawImage.fromBlob(source)
  } else {
    // Fallback: HTMLImageElement → blob via canvas
    const canvas = document.createElement('canvas')
    canvas.width = source.naturalWidth
    canvas.height = source.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create canvas context')
    ctx.drawImage(source, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    })
    rawImage = await RawImage.fromBlob(blob)
  }

  const labels = trimmed
    .split(',')
    .map((s) => templateLabel(s))
    .filter(Boolean)

  const results = await detector(rawImage, labels, {
    threshold: 0.1,
    topk: 100,
  })

  return results.map((r) => ({
    // Strip the "a photo of a " prefix for display
    class: r.label.replace(/^a photo of (a |an |the )?/, ''),
    score: r.score,
    bbox: [r.box.xmin, r.box.ymin, r.box.xmax - r.box.xmin, r.box.ymax - r.box.ymin],
  }))
}
