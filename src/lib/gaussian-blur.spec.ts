import { describe, expect, it } from 'vitest'
import { applyGaussianBlur, generateGaussianKernel } from './gaussian-blur'

describe('generateGaussianKernel', () => {
  it('generates a kernel of correct size', () => {
    const kernel = generateGaussianKernel(2, 1)
    expect(kernel).toHaveLength(5) // 2 * 2 + 1
  })

  it('generates a kernel that sums to approximately 1', () => {
    const kernel = generateGaussianKernel(3, 1.5)
    const sum = kernel.reduce((acc, v) => acc + v, 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it('has the maximum value at the center', () => {
    const kernel = generateGaussianKernel(3, 1)
    const center = kernel[3] ?? 0
    expect(center).toBeGreaterThan(0)
    for (let i = 0; i < kernel.length; i++) {
      if (i !== 3) {
        expect(kernel[i]).toBeLessThanOrEqual(center)
      }
    }
  })

  it('is symmetric', () => {
    const kernel = generateGaussianKernel(4, 2)
    for (let i = 0; i < kernel.length; i++) {
      expect(kernel[i]).toBeCloseTo(kernel[kernel.length - 1 - i] ?? 0, 10)
    }
  })

  it('larger sigma produces a flatter kernel', () => {
    const narrow = generateGaussianKernel(5, 0.5)
    const wide = generateGaussianKernel(5, 3)

    // The center weight of the narrow kernel should be larger
    expect(narrow[5]).toBeGreaterThan(wide[5] ?? 0)
  })
})

describe('applyGaussianBlur', () => {
  function createSolidImageData(
    width: number,
    height: number,
    rgba: [number, number, number, number]
  ): ImageData {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = rgba[0]
      data[i * 4 + 1] = rgba[1]
      data[i * 4 + 2] = rgba[2]
      data[i * 4 + 3] = rgba[3]
    }
    return new ImageData(data, width, height)
  }

  function createCheckerImageData(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const isWhite = (x + y) % 2 === 0
        const value = isWhite ? 255 : 0
        data[idx] = value
        data[idx + 1] = value
        data[idx + 2] = value
        data[idx + 3] = 255
      }
    }
    return new ImageData(data, width, height)
  }

  it('returns the same image data for zero-size region', () => {
    const img = createSolidImageData(10, 10, [255, 0, 0, 255])
    const result = applyGaussianBlur(img, { x: 5, y: 5, width: 0, height: 0 }, 3)
    expect(result.data).toEqual(img.data)
  })

  it('returns the same image data for out-of-bounds region', () => {
    const img = createSolidImageData(10, 10, [255, 0, 0, 255])
    const result = applyGaussianBlur(img, { x: 20, y: 20, width: 5, height: 5 }, 3)
    expect(result.data).toEqual(img.data)
  })

  it('does not modify pixels outside the region', () => {
    const img = createSolidImageData(20, 20, [128, 64, 32, 255])
    const result = applyGaussianBlur(img, { x: 5, y: 5, width: 5, height: 5 }, 2)

    // Check a pixel outside the region
    const outsideIdx = (0 * 20 + 0) * 4
    expect(result.data[outsideIdx]).toBe(128)
    expect(result.data[outsideIdx + 1]).toBe(64)
    expect(result.data[outsideIdx + 2]).toBe(32)
    expect(result.data[outsideIdx + 3]).toBe(255)
  })

  it('does not change a solid-color region', () => {
    const img = createSolidImageData(10, 10, [100, 100, 100, 255])
    const result = applyGaussianBlur(img, { x: 2, y: 2, width: 6, height: 6 }, 2)

    // Blurring a solid color should produce the same color (within rounding)
    for (let y = 2; y < 8; y++) {
      for (let x = 2; x < 8; x++) {
        const idx = (y * 10 + x) * 4
        expect(result.data[idx]).toBeCloseTo(100, 0)
        expect(result.data[idx + 1]).toBeCloseTo(100, 0)
        expect(result.data[idx + 2]).toBeCloseTo(100, 0)
      }
    }
  })

  it('blurs a checkerboard pattern toward the average', () => {
    const img = createCheckerImageData(20, 20)
    const result = applyGaussianBlur(img, { x: 0, y: 0, width: 20, height: 20 }, 5)

    // Center pixels should be blurred toward ~128 (average of 0 and 255)
    const centerIdx = (10 * 20 + 10) * 4
    const centerValue = result.data[centerIdx] ?? 0
    expect(centerValue).toBeGreaterThan(50)
    expect(centerValue).toBeLessThan(200)
  })

  it('clamps region to image bounds', () => {
    const img = createSolidImageData(10, 10, [200, 100, 50, 255])
    // Region extends beyond image bounds
    const result = applyGaussianBlur(img, { x: -5, y: -5, width: 20, height: 20 }, 2)
    expect(result.width).toBe(10)
    expect(result.height).toBe(10)
  })

  it('respects custom sigma parameter', () => {
    const img = createCheckerImageData(20, 20)
    const smallSigma = applyGaussianBlur(img, { x: 0, y: 0, width: 20, height: 20 }, 5, 0.5)
    const largeSigma = applyGaussianBlur(img, { x: 0, y: 0, width: 20, height: 20 }, 5, 5)

    // Larger sigma should produce more blurring — center pixel closer to 128
    const centerIdx = (10 * 20 + 10) * 4
    const smallDiff = Math.abs((smallSigma.data[centerIdx] ?? 0) - 128)
    const largeDiff = Math.abs((largeSigma.data[centerIdx] ?? 0) - 128)
    expect(largeDiff).toBeLessThan(smallDiff)
  })

  it('produces a new ImageData object', () => {
    const img = createSolidImageData(10, 10, [255, 0, 0, 255])
    const result = applyGaussianBlur(img, { x: 0, y: 0, width: 10, height: 10 }, 2)
    expect(result).not.toBe(img)
    expect(result.data).not.toBe(img.data)
  })
})
