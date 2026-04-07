import { describe, expect, it, vi } from 'vitest'

const mockDetector = vi.fn().mockResolvedValue([
  {
    score: 0.95,
    label: 'a photo of a laptop',
    box: { xmin: 10, ymin: 20, xmax: 110, ymax: 100 },
  },
  {
    score: 0.88,
    label: 'a photo of a person',
    box: { xmin: 200, ymin: 50, xmax: 350, ymax: 350 },
  },
])

const mockRawImage = { width: 200, height: 200 }

vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue(mockDetector),
  RawImage: {
    fromBlob: vi.fn().mockResolvedValue(mockRawImage),
  },
}))

const { detectObjects } = await import('./detect-objects')

describe('detectObjects', () => {
  const mockBlob = new Blob(['fake'], { type: 'image/png' })

  it('returns empty array when query is empty', async () => {
    const results = await detectObjects(mockBlob, '')
    expect(results).toHaveLength(0)
    expect(mockDetector).not.toHaveBeenCalled()
  })

  it('returns empty array when query is whitespace', async () => {
    const results = await detectObjects(mockBlob, '   ')
    expect(results).toHaveLength(0)
  })

  it('templates single-noun queries with "a photo of a"', async () => {
    await detectObjects(mockBlob, 'laptop')
    expect(mockDetector).toHaveBeenCalledWith(
      mockRawImage,
      ['a photo of a laptop'],
      expect.objectContaining({ threshold: 0.1, topk: 100 })
    )
  })

  it('does not double-template phrases that start with an article', async () => {
    await detectObjects(mockBlob, 'a red car')
    expect(mockDetector).toHaveBeenCalledWith(mockRawImage, ['a red car'], expect.any(Object))
  })

  it('does not template multi-word phrases', async () => {
    await detectObjects(mockBlob, 'license plate')
    expect(mockDetector).toHaveBeenCalledWith(mockRawImage, ['license plate'], expect.any(Object))
  })

  it('splits comma-separated queries into multiple labels', async () => {
    await detectObjects(mockBlob, 'laptop, mug, book')
    expect(mockDetector).toHaveBeenCalledWith(
      mockRawImage,
      ['a photo of a laptop', 'a photo of a mug', 'a photo of a book'],
      expect.any(Object)
    )
  })

  it('strips the "a photo of a" prefix from result labels', async () => {
    const results = await detectObjects(mockBlob, 'laptop')
    expect(results[0]?.class).toBe('laptop')
    expect(results[1]?.class).toBe('person')
  })

  it('converts pipeline boxes to xywh format', async () => {
    const results = await detectObjects(mockBlob, 'laptop')
    expect(results[0]?.bbox).toEqual([10, 20, 100, 80])
  })
})
