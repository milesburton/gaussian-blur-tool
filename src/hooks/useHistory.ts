import { useCallback, useRef, useState } from 'react'

export function useHistory(maxSize = 50) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const pastRef = useRef<ImageData[]>([])
  const futureRef = useRef<ImageData[]>([])

  const updateFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  const pushState = useCallback(
    (imageData: ImageData) => {
      pastRef.current.push(
        new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
      )
      if (pastRef.current.length > maxSize) {
        pastRef.current.shift()
      }
      // Clear redo stack on new action
      futureRef.current = []
      updateFlags()
    },
    [maxSize, updateFlags]
  )

  const undo = useCallback(
    (currentData: ImageData): ImageData | null => {
      const previous = pastRef.current.pop()
      if (!previous) return null

      futureRef.current.push(
        new ImageData(
          new Uint8ClampedArray(currentData.data),
          currentData.width,
          currentData.height
        )
      )
      updateFlags()
      return previous
    },
    [updateFlags]
  )

  const redo = useCallback(
    (currentData: ImageData): ImageData | null => {
      const next = futureRef.current.pop()
      if (!next) return null

      pastRef.current.push(
        new ImageData(
          new Uint8ClampedArray(currentData.data),
          currentData.width,
          currentData.height
        )
      )
      updateFlags()
      return next
    },
    [updateFlags]
  )

  const clear = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    updateFlags()
  }, [updateFlags])

  return { canUndo, canRedo, pushState, undo, redo, clear }
}
