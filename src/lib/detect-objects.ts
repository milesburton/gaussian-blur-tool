import type { DetectedObject } from '@/types'

let modelPromise: Promise<import('@tensorflow-models/coco-ssd').ObjectDetection> | null = null

async function getModel() {
  if (!modelPromise) {
    const [tf, cocoSsd] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/coco-ssd'),
    ])
    await tf.ready()
    modelPromise = cocoSsd.load()
  }
  return modelPromise
}

export async function detectObjects(
  image: HTMLImageElement,
  query?: string
): Promise<DetectedObject[]> {
  const model = await getModel()
  const predictions = await model.detect(image)

  const all = predictions.map((p) => ({
    class: p.class,
    score: p.score,
    bbox: p.bbox as [number, number, number, number],
  }))

  if (!query?.trim()) return all

  const lowerQuery = query.trim().toLowerCase()
  return all.filter((obj) => obj.class.toLowerCase().includes(lowerQuery))
}
