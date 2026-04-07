import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory } from '@/hooks/useHistory'
import { useRegionSelection } from '@/hooks/useRegionSelection'
import { detectObjects } from '@/lib/detect-objects'
import { applyBlurToSelection } from '@/lib/gaussian-blur'
import type { DetectedObject, Selection } from '@/types'

interface BlurCanvasProps {
  image: HTMLImageElement
  imageBlob: Blob | null
  blurRadius: number
  detectQuery: string
}

function drawSelection(ctx: CanvasRenderingContext2D, selection: Selection) {
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 3])

  if (selection.type === 'rectangle') {
    const { x, y, width, height } = selection.region
    ctx.strokeRect(x, y, width, height)
  }

  ctx.setLineDash([])
}

function drawDetectedObjects(ctx: CanvasRenderingContext2D, objects: DetectedObject[]) {
  for (const obj of objects) {
    const [x, y, w, h] = obj.bbox
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])

    const label = `${obj.class} (${Math.round(obj.score * 100)}%)`
    ctx.font = '14px system-ui, sans-serif'
    const metrics = ctx.measureText(label)
    ctx.fillStyle = 'rgba(234, 179, 8, 0.9)'
    ctx.fillRect(x, y - 20, metrics.width + 8, 20)
    ctx.fillStyle = '#000'
    ctx.fillText(label, x + 4, y - 5)
  }
}

export function BlurCanvas({ image, imageBlob, blurRadius, detectQuery }: BlurCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentDataRef = useRef<ImageData | null>(null)
  const { canUndo, canRedo, pushState, undo, redo, clear: clearHistory } = useHistory()
  const { selection, isSelecting, onMouseDown, onMouseMove, onMouseUp, clearSelection } =
    useRegionSelection(canvasRef)
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [isDetecting, setIsDetecting] = useState(false)

  const hasDetectQuery = useMemo(() => detectQuery.trim().length > 0, [detectQuery])

  // Draw the image onto the canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(image, 0, 0)
    currentDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    clearHistory()
    setDetectedObjects([])
  }, [image, clearHistory])

  // Run object detection when query changes
  useEffect(() => {
    if (!hasDetectQuery) {
      setDetectedObjects([])
      return
    }

    setIsDetecting(true)
    const timer = setTimeout(() => {
      detectObjects(imageBlob ?? image, detectQuery)
        .then((objects) => {
          setDetectedObjects(objects)
        })
        .finally(() => {
          setIsDetecting(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [image, imageBlob, detectQuery, hasDetectQuery])

  // Redraw canvas with current state + overlays
  useEffect(() => {
    const canvas = canvasRef.current
    const currentData = currentDataRef.current
    if (!canvas || !currentData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (
      selection &&
      selection.type === 'rectangle' &&
      selection.region.width > 0 &&
      selection.region.height > 0
    ) {
      const previewData = applyBlurToSelection(
        new ImageData(
          new Uint8ClampedArray(currentData.data),
          currentData.width,
          currentData.height
        ),
        selection,
        blurRadius
      )
      ctx.putImageData(previewData, 0, 0)
      drawSelection(ctx, selection)
    } else {
      ctx.putImageData(currentData, 0, 0)
    }

    if (detectedObjects.length > 0) {
      drawDetectedObjects(ctx, detectedObjects)
    }
  }, [selection, blurRadius, detectedObjects])

  const handleApplyBlur = useCallback(() => {
    const currentData = currentDataRef.current
    if (
      !currentData ||
      !selection ||
      selection.type !== 'rectangle' ||
      selection.region.width <= 0 ||
      selection.region.height <= 0
    )
      return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    pushState(currentData)

    const blurredData = applyBlurToSelection(
      new ImageData(new Uint8ClampedArray(currentData.data), currentData.width, currentData.height),
      selection,
      blurRadius
    )
    currentDataRef.current = blurredData
    ctx.putImageData(blurredData, 0, 0)
    clearSelection()
  }, [selection, blurRadius, clearSelection, pushState])

  const handleBlurDetectedObject = useCallback(
    (obj: DetectedObject) => {
      const currentData = currentDataRef.current
      if (!currentData) return

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return

      pushState(currentData)

      const [x, y, w, h] = obj.bbox
      const sel: Selection = {
        type: 'rectangle',
        region: { x, y, width: w, height: h },
      }
      const blurredData = applyBlurToSelection(
        new ImageData(
          new Uint8ClampedArray(currentData.data),
          currentData.width,
          currentData.height
        ),
        sel,
        blurRadius
      )
      currentDataRef.current = blurredData
      ctx.putImageData(blurredData, 0, 0)

      drawDetectedObjects(ctx, detectedObjects)
    },
    [blurRadius, pushState, detectedObjects]
  )

  const handleBlurAllDetected = useCallback(() => {
    const currentData = currentDataRef.current
    if (!currentData || detectedObjects.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    pushState(currentData)

    let data = new ImageData(
      new Uint8ClampedArray(currentData.data),
      currentData.width,
      currentData.height
    )

    for (const obj of detectedObjects) {
      const [x, y, w, h] = obj.bbox
      data = applyBlurToSelection(
        data,
        { type: 'rectangle', region: { x, y, width: w, height: h } },
        blurRadius
      )
    }

    currentDataRef.current = data
    ctx.putImageData(data, 0, 0)
  }, [detectedObjects, blurRadius, pushState])

  const handleUndo = useCallback(() => {
    const currentData = currentDataRef.current
    if (!currentData) return

    const previous = undo(currentData)
    if (!previous) return

    currentDataRef.current = previous
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.putImageData(previous, 0, 0)
    clearSelection()
  }, [undo, clearSelection])

  const handleRedo = useCallback(() => {
    const currentData = currentDataRef.current
    if (!currentData) return

    const next = redo(currentData)
    if (!next) return

    currentDataRef.current = next
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) ctx.putImageData(next, 0, 0)
    clearSelection()
  }, [redo, clearSelection])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'blurred-image.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (detectedObjects.length === 0) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      for (const obj of detectedObjects) {
        const [bx, by, bw, bh] = obj.bbox
        if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
          handleBlurDetectedObject(obj)
          return
        }
      }
    },
    [detectedObjects, handleBlurDetectedObject]
  )

  const showApplyButton =
    selection &&
    !isSelecting &&
    selection.type === 'rectangle' &&
    selection.region.width > 0 &&
    selection.region.height > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            data-testid="undo-button"
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            data-testid="redo-button"
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Redo
          </button>
        </div>
        <div className="flex gap-2">
          {showApplyButton && (
            <button
              type="button"
              onClick={handleApplyBlur}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Apply Blur
            </button>
          )}
          {detectedObjects.length > 0 && (
            <button
              type="button"
              onClick={handleBlurAllDetected}
              data-testid="blur-all-detected"
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
            >
              Blur All Detected ({detectedObjects.length})
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
      </div>
      {isDetecting && (
        <div
          className="text-sm text-yellow-600 dark:text-yellow-400"
          data-testid="detecting-status"
        >
          Searching for "{detectQuery}"...
        </div>
      )}
      {!isDetecting && hasDetectQuery && detectedObjects.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No matching objects found for "{detectQuery}".
        </div>
      )}
      <canvas
        ref={canvasRef}
        data-testid="blur-canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={handleCanvasClick}
        className="max-w-full h-auto border border-gray-200 dark:border-gray-700 rounded cursor-crosshair"
      />
    </div>
  )
}
