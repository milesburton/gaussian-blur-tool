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
 * Applies a gaussian blur to a rectangular region of an ImageData object.
 * Uses two-pass separable convolution (horizontal then vertical) for efficiency.
 */
export function applyGaussianBlur(
  imageData: ImageData,
  region: { x: number; y: number; width: number; height: number },
  radius: number,
  sigma?: number
): ImageData {
  const effectiveSigma = sigma ?? radius / 3
  const kernel = generateGaussianKernel(radius, effectiveSigma)
  const { width, height, data } = imageData

  // Clamp region to image bounds
  const x0 = Math.max(0, Math.floor(region.x))
  const y0 = Math.max(0, Math.floor(region.y))
  const x1 = Math.min(width, Math.floor(region.x + region.width))
  const y1 = Math.min(height, Math.floor(region.y + region.height))

  const regionWidth = x1 - x0
  const regionHeight = y1 - y0

  if (regionWidth <= 0 || regionHeight <= 0) {
    return imageData
  }

  // Create a copy of the output data
  const output = new Uint8ClampedArray(data)

  // Temporary buffer for the intermediate horizontal pass
  const temp = new Uint8ClampedArray(regionWidth * regionHeight * 4)

  // Horizontal pass
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

  // Vertical pass
  for (let y = 0; y < regionHeight; y++) {
    for (let x = 0; x < regionWidth; x++) {
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

      const outIdx = ((y0 + y) * width + (x0 + x)) * 4
      output[outIdx] = r
      output[outIdx + 1] = g
      output[outIdx + 2] = b
      output[outIdx + 3] = a
    }
  }

  return new ImageData(output, width, height)
}
