import { useCallback, useRef, useState } from 'react'
import type { Point, Selection, SelectionMode } from '@/types'

export function useRegionSelection(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  mode: SelectionMode
) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const startPoint = useRef<Point | null>(null)
  const freeformPoints = useRef<Point[]>([])

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    [canvasRef]
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode === 'detect') return
      const point = getCanvasPoint(e)
      if (!point) return

      startPoint.current = point
      setIsSelecting(true)

      if (mode === 'freeform') {
        freeformPoints.current = [point]
        setSelection({ type: 'freeform', points: [point] })
      } else {
        setSelection(null)
      }
    },
    [getCanvasPoint, mode]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isSelecting || !startPoint.current) return

      const point = getCanvasPoint(e)
      if (!point) return

      if (mode === 'freeform') {
        freeformPoints.current.push(point)
        setSelection({ type: 'freeform', points: [...freeformPoints.current] })
      } else {
        const start = startPoint.current
        setSelection({
          type: 'rectangle',
          region: {
            x: Math.min(start.x, point.x),
            y: Math.min(start.y, point.y),
            width: Math.abs(point.x - start.x),
            height: Math.abs(point.y - start.y),
          },
        })
      }
    },
    [isSelecting, getCanvasPoint, mode]
  )

  const onMouseUp = useCallback(() => {
    setIsSelecting(false)
    startPoint.current = null
    freeformPoints.current = []
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(null)
  }, [])

  return {
    selection,
    setSelection,
    isSelecting,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    clearSelection,
  }
}
