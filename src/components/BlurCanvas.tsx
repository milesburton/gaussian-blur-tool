import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory } from '@/hooks/useHistory'
import { useRegionSelection } from '@/hooks/useRegionSelection'
import { detectObjects } from '@/lib/detect-objects'
import { applyBlurToSelection } from '@/lib/gaussian-blur'
import type { DetectedObject, Selection, SelectionMode } from '@/types'

interface BlurCanvasProps {
  image: HTMLImageElement
  blurRadius: number
  selectionMode: SelectionMode
  detectQuery: string
}

function drawSelection(ctx: CanvasRenderingContext2D, selection: Selection) {
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 3])

  if (selection.type === 'rectangle') {
    const { x, y, width, height } = selection.region
    ctx.strokeRect(x, y, width, height)
  } else if (selection.points.length >= 2) {
    ctx.beginPath()
    const first = selection.points[0]
    if (first) {
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < selection.points.length; i++) {
        const p = selection.points[i]
        if (p) ctx.lineTo(p.x, p.y)
      }
      ctx.closePath()
      ctx.stroke()

      // Semi-transparent fill
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
      ctx.fill()
    }
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

    // Label
    const label = `${obj.class} (${Math.round(obj.score * 100)}%)`
    ctx.font = '14px system-ui, sans-serif'
    const metrics = ctx.measureText(label)
    ctx.fillStyle = 'rgba(234, 179, 8, 0.9)'
    ctx.fillRect(x, y - 20, metrics.width + 8, 20)
    ctx.fillStyle = '#000'
    ctx.fillText(label, x + 4, y - 5)
  }
}

function hasSelectionArea(selection: Selection): boolean {
  if (selection.type === 'rectangle') {
    return selection.region.width > 0 && selection.region.height > 0
  }
  return selection.points.length >= 3
}

export function BlurCanvas({ image, blurRadius, selectionMode, detectQuery }: BlurCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentDataRef = useRef<ImageData | null>(null)
  const { canUndo, canRedo, pushState, undo, redo, clear: clearHistory } = useHistory()
  const { selection, isSelecting, onMouseDown, onMouseMove, onMouseUp, clearSelection } =
    useRegionSelection(canvasRef, selectionMode)
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [isDetecting, setIsDetecting] = useState(false)

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

  // Run object detection when query changes in detect mode
  useEffect(() => {
    if (selectionMode !== 'detect') {
      setDetectedObjects([])
      return
    }

    if (!detectQuery.trim()) {
      setDetectedObjects([])
      return
    }

    setIsDetecting(true)
    const timer = setTimeout(() => {
      detectObjects(image, detectQuery)
        .then((objects) => {
          setDetectedObjects(objects)
        })
        .finally(() => {
          setIsDetecting(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [selectionMode, image, detectQuery])

  // Redraw canvas with current state + overlays
  useEffect(() => {
    const canvas = canvasRef.current
    const currentData = currentDataRef.current
    if (!canvas || !currentData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Start from current committed state
    if (selection && hasSelectionArea(selection)) {
      // Show preview: blur applied to selection
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

    // Draw detected object overlays
    if (selectionMode === 'detect' && detectedObjects.length > 0) {
      drawDetectedObjects(ctx, detectedObjects)
    }
  }, [selection, blurRadius, detectedObjects, selectionMode])

  const handleApplyBlur = useCallback(() => {
    const currentData = currentDataRef.current
    if (!currentData || !selection || !hasSelectionArea(selection)) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    // Save current state for undo
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

      // Redraw remaining detected object overlays
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

  // Keyboard shortcuts for undo/redo
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

  // Handle clicking on a detected object
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (selectionMode !== 'detect' || detectedObjects.length === 0) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      // Find clicked object
      for (const obj of detectedObjects) {
        const [bx, by, bw, bh] = obj.bbox
        if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
          handleBlurDetectedObject(obj)
          return
        }
      }
    },
    [selectionMode, detectedObjects, handleBlurDetectedObject]
  )

  const showApplyButton = selection && !isSelecting && hasSelectionArea(selection)

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
          {selectionMode === 'detect' && detectedObjects.length > 0 && (
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
      {selectionMode === 'detect' &&
        !isDetecting &&
        detectQuery.trim() &&
        detectedObjects.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            No matching objects found for "{detectQuery}".
          </div>
        )}
      <canvas
        ref={canvasRef}
        data-testid="blur-canvas"
        onMouseDown={selectionMode !== 'detect' ? onMouseDown : undefined}
        onMouseMove={selectionMode !== 'detect' ? onMouseMove : undefined}
        onMouseUp={selectionMode !== 'detect' ? onMouseUp : undefined}
        onMouseLeave={selectionMode !== 'detect' ? onMouseUp : undefined}
        onClick={handleCanvasClick}
        className={`max-w-full h-auto border border-gray-200 dark:border-gray-700 rounded ${
          selectionMode === 'detect' ? 'cursor-pointer' : 'cursor-crosshair'
        }`}
      />
    </div>
  )
}
