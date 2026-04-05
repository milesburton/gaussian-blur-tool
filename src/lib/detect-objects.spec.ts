import { describe, expect, it, vi } from 'vitest'

// Mock TensorFlow.js and COCO-SSD to avoid loading the model in tests
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
}))

const mockPredictions = [
  { class: 'laptop', score: 0.95, bbox: [10, 20, 100, 80] },
  { class: 'person', score: 0.88, bbox: [200, 50, 150, 300] },
  { class: 'car', score: 0.72, bbox: [400, 100, 200, 100] },
]

vi.mock('@tensorflow-models/coco-ssd', () => ({
  load: vi.fn().mockResolvedValue({
    detect: vi.fn().mockResolvedValue(mockPredictions),
  }),
}))

// Import after mocking
const { detectObjects } = await import('./detect-objects')

describe('detectObjects', () => {
  const mockImage = {} as HTMLImageElement

  it('returns all objects when no query is provided', async () => {
    const results = await detectObjects(mockImage)
    expect(results).toHaveLength(3)
  })

  it('returns all objects when query is empty string', async () => {
    const results = await detectObjects(mockImage, '')
    expect(results).toHaveLength(3)
  })

  it('returns all objects when query is whitespace', async () => {
    const results = await detectObjects(mockImage, '   ')
    expect(results).toHaveLength(3)
  })

  it('filters objects by query (exact match)', async () => {
    const results = await detectObjects(mockImage, 'laptop')
    expect(results).toHaveLength(1)
    expect(results[0]?.class).toBe('laptop')
  })

  it('filters objects by query (case insensitive)', async () => {
    const results = await detectObjects(mockImage, 'PERSON')
    expect(results).toHaveLength(1)
    expect(results[0]?.class).toBe('person')
  })

  it('filters objects by partial match', async () => {
    const results = await detectObjects(mockImage, 'car')
    expect(results).toHaveLength(1)
    expect(results[0]?.class).toBe('car')
  })

  it('returns empty array when no objects match', async () => {
    const results = await detectObjects(mockImage, 'airplane')
    expect(results).toHaveLength(0)
  })
})
