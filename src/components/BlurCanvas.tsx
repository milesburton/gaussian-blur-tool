import { useCallback, useEffect, useRef } from 'react'
import { useRegionSelection } from '@/hooks/useRegionSelection'
import { applyGaussianBlur } from '@/lib/gaussian-blur'
import type { Region } from '@/types'

interface BlurCanvasProps {
  image: HTMLImageElement
  blurRadius: number
  onRegionChange?: (region: Region | null) => void
}

export function BlurCanvas({ image, blurRadius, onRegionChange }: BlurCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalDataRef = useRef<ImageData | null>(null)
  const { region, isSelecting, onMouseDown, onMouseMove, onMouseUp, clearRegion } =
    useRegionSelection(canvasRef)

  // Draw the image onto the canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(image, 0, 0)
    originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }, [image])

  // Notify parent of region changes
  useEffect(() => {
    onRegionChange?.(region)
  }, [region, onRegionChange])

  // Redraw with blur applied to the selected region
  useEffect(() => {
    const canvas = canvasRef.current
    const originalData = originalDataRef.current
    if (!canvas || !originalData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (region && region.width > 0 && region.height > 0) {
      const blurredData = applyGaussianBlur(
        new ImageData(
          new Uint8ClampedArray(originalData.data),
          originalData.width,
          originalData.height
        ),
        region,
        blurRadius
      )
      ctx.putImageData(blurredData, 0, 0)

      // Draw selection rectangle
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(region.x, region.y, region.width, region.height)
      ctx.setLineDash([])
    } else {
      ctx.putImageData(originalData, 0, 0)
    }
  }, [region, blurRadius])

  const handleApplyBlur = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !region) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const originalData = originalDataRef.current
    if (!originalData) return

    // Apply blur permanently to the original data
    const blurredData = applyGaussianBlur(
      new ImageData(
        new Uint8ClampedArray(originalData.data),
        originalData.width,
        originalData.height
      ),
      region,
      blurRadius
    )
    originalDataRef.current = blurredData
    ctx.putImageData(blurredData, 0, 0)
    clearRegion()
  }, [region, blurRadius, clearRegion])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'blurred-image.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 justify-end">
        {region && !isSelecting && (
          <button
            type="button"
            onClick={handleApplyBlur}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Apply Blur
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
        >
          Download
        </button>
      </div>
      <canvas
        ref={canvasRef}
        data-testid="blur-canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        className="max-w-full h-auto cursor-crosshair border border-gray-200 dark:border-gray-700 rounded"
      />
    </div>
  )
}
