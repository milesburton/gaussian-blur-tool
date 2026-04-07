import { useCallback, useState } from 'react'

interface LoadedImage {
  element: HTMLImageElement
  blob: Blob
  fileName: string
}

export function useImageUpload() {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null)

  const loadImage = useCallback((blob: Blob, fileName: string) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      setLoaded({ element: img, blob, fileName })
    }

    img.src = url
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file?.type.startsWith('image/')) {
        loadImage(file, file.name)
      }
    },
    [loadImage]
  )

  const loadFromUrl = useCallback(
    async (url: string, fileName: string) => {
      const response = await fetch(url)
      const blob = await response.blob()
      loadImage(blob, fileName)
    },
    [loadImage]
  )

  const clear = useCallback(() => {
    setLoaded(null)
  }, [])

  return {
    image: loaded?.element ?? null,
    blob: loaded?.blob ?? null,
    fileName: loaded?.fileName ?? null,
    handleFiles,
    loadFromUrl,
    clear,
  }
}
