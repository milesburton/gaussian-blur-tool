import { describe, expect, it, vi } from 'vitest'

const mockDetector = vi.fn().mockResolvedValue([
  { score: 0.95, label: 'laptop', box: { xmin: 10, ymin: 20, xmax: 110, ymax: 100 } },
  { score: 0.88, label: 'person', box: { xmin: 200, ymin: 50, xmax: 350, ymax: 350 } },
])

vi.mock('@huggingface/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue(mockDetector),
}))

const { detectObjects } = await import('./detect-objects')

// Mock canvas for imageToDataUrl
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
}) as unknown as typeof HTMLCanvasElement.prototype.getContext

HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock')

describe('detectObjects', () => {
  const mockImage = { naturalWidth: 200, naturalHeight: 200 } as HTMLImageElement

  it('returns empty array when query is empty', async () => {
    const results = await detectObjects(mockImage, '')
    expect(results).toHaveLength(0)
    expect(mockDetector).not.toHaveBeenCalled()
  })

  it('returns empty array when query is whitespace', async () => {
    const results = await detectObjects(mockImage, '   ')
    expect(results).toHaveLength(0)
  })

  it('passes query labels to the detector', async () => {
    await detectObjects(mockImage, 'laptop')
    expect(mockDetector).toHaveBeenCalledWith(
      expect.any(String),
      ['laptop'],
      expect.objectContaining({ threshold: 0.05 })
    )
  })

  it('splits comma-separated queries into multiple labels', async () => {
    await detectObjects(mockImage, 'laptop, person, car')
    expect(mockDetector).toHaveBeenCalledWith(
      expect.any(String),
      ['laptop', 'person', 'car'],
      expect.any(Object)
    )
  })

  it('converts results to DetectedObject format', async () => {
    const results = await detectObjects(mockImage, 'laptop')
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      class: 'laptop',
      score: 0.95,
      bbox: [10, 20, 100, 80], // xmin, ymin, width, height
    })
  })

  it('trims whitespace from query', async () => {
    await detectObjects(mockImage, '  laptop  ')
    expect(mockDetector).toHaveBeenCalledWith(expect.any(String), ['laptop'], expect.any(Object))
  })
})
