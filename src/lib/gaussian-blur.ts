import type { FreeformSelection, Point, RectangleSelection, Selection } from '@/types'

function getPixel(data: Uint8ClampedArray, idx: number): number {
  return data[idx] ?? 0
}

function getWeight(kernel: number[], idx: number): number {
  return kernel[idx] ?? 0
}

/**
 * Generates a 1D Gaussian kernel for the given radius and sigma.
 * The kernel is normalized so all values sum to 1.
 */
export function generateGaussianKernel(radius: number, sigma: number): number[] {
  const size = radius * 2 + 1
  const kernel: number[] = new Array(size)
  let sum = 0

  for (let i = 0; i < size; i++) {
    const x = i - radius
    const value = Math.exp(-(x * x) / (2 * sigma * sigma))
    kernel[i] = value
    sum += value
  }

  for (let i = 0; i < size; i++) {
    kernel[i] = getWeight(kernel, i) / sum
  }

  return kernel
}

/**
 * Tests if a point is inside a polygon using the ray casting algorithm.
 */
export function isPointInPolygon(x: number, y: number, points: Point[]): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i]
    const pj = points[j]
    if (!pi || !pj) continue

    const xi = pi.x
    const yi = pi.y
    const xj = pj.x
    const yj = pj.y

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Creates a binary mask for a selection (rectangle or freeform polygon).
 * Returns a Uint8Array where 1 = inside selection, 0 = outside.
 */
export function createSelectionMask(
  selection: Selection,
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height)

  if (selection.type === 'rectangle') {
    const { x, y, width: rw, height: rh } = selection.region
    const x0 = Math.max(0, Math.floor(x))
    const y0 = Math.max(0, Math.floor(y))
    const x1 = Math.min(width, Math.floor(x + rw))
    const y1 = Math.min(height, Math.floor(y + rh))

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        mask[py * width + px] = 1
      }
    }
  } else {
    if (selection.points.length < 3) return mask

    // Compute bounding box for efficiency
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of selection.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }

    const x0 = Math.max(0, Math.floor(minX))
    const y0 = Math.max(0, Math.floor(minY))
    const x1 = Math.min(width, Math.ceil(maxX))
    const y1 = Math.min(height, Math.ceil(maxY))

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        if (isPointInPolygon(px, py, selection.points)) {
          mask[py * width + px] = 1
        }
      }
    }
  }

  return mask
}

/**
 * Applies a gaussian blur to pixels covered by a binary mask.
 * Uses two-pass separable convolution within the mask's bounding box,
 * then composites only masked pixels back.
 */
export function applyGaussianBlurWithMask(
  imageData: ImageData,
  mask: Uint8Array,
  radius: number,
  sigma?: number
): ImageData {
  const effectiveSigma = sigma ?? radius / 3
  const kernel = generateGaussianKernel(radius, effectiveSigma)
  const { width, height, data } = imageData

  // Find bounding box of the mask
  let x0 = width
  let y0 = height
  let x1 = 0
  let y1 = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x + 1)
        y1 = Math.max(y1, y + 1)
      }
    }
  }

  if (x0 >= x1 || y0 >= y1) return imageData

  const regionWidth = x1 - x0
  const regionHeight = y1 - y0

  const output = new Uint8ClampedArray(data)
  const temp = new Uint8ClampedArray(regionWidth * regionHeight * 4)

  // Horizontal pass over bounding box
  for (let y = 0; y < regionHeight; y++) {
    for (let x = 0; x < regionWidth; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      for (let k = -radius; k <= radius; k++) {
        const srcX = Math.min(Math.max(x0 + x + k, x0), x1 - 1)
        const srcIdx = ((y0 + y) * width + srcX) * 4
        const weight = getWeight(kernel, k + radius)

        r += getPixel(data, srcIdx) * weight
        g += getPixel(data, srcIdx + 1) * weight
        b += getPixel(data, srcIdx + 2) * weight
        a += getPixel(data, srcIdx + 3) * weight
      }

      const tempIdx = (y * regionWidth + x) * 4
      temp[tempIdx] = r
      temp[tempIdx + 1] = g
      temp[tempIdx + 2] = b
      temp[tempIdx + 3] = a
    }
  }

  // Vertical pass, only write to masked pixels
  for (let y = 0; y < regionHeight; y++) {
    for (let x = 0; x < regionWidth; x++) {
      const globalX = x0 + x
      const globalY = y0 + y
      if (!mask[globalY * width + globalX]) continue

      let r = 0
      let g = 0
      let b = 0
      let a = 0

      for (let k = -radius; k <= radius; k++) {
        const srcY = Math.min(Math.max(y + k, 0), regionHeight - 1)
        const tempIdx = (srcY * regionWidth + x) * 4
        const weight = getWeight(kernel, k + radius)

        r += getPixel(temp, tempIdx) * weight
        g += getPixel(temp, tempIdx + 1) * weight
        b += getPixel(temp, tempIdx + 2) * weight
        a += getPixel(temp, tempIdx + 3) * weight
      }

      const outIdx = (globalY * width + globalX) * 4
      output[outIdx] = r
      output[outIdx + 1] = g
      output[outIdx + 2] = b
      output[outIdx + 3] = a
    }
  }

  return new ImageData(output, width, height)
}

/**
 * Convenience function: applies blur for any selection type.
 */
export function applyBlurToSelection(
  imageData: ImageData,
  selection: Selection,
  radius: number,
  sigma?: number
): ImageData {
  const mask = createSelectionMask(selection, imageData.width, imageData.height)
  return applyGaussianBlurWithMask(imageData, mask, radius, sigma)
}

/**
 * Convenience: creates a RectangleSelection from a Region.
 */
export function rectangleSelection(region: {
  x: number
  y: number
  width: number
  height: number
}): RectangleSelection {
  return { type: 'rectangle', region }
}

/**
 * Convenience: creates a FreeformSelection from points.
 */
export function freeformSelection(points: Point[]): FreeformSelection {
  return { type: 'freeform', points }
}
