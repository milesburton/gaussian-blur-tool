import { useCallback, useState } from 'react'

export function useImageUpload() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const loadImage = useCallback((file: File) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      setImage(img)
      setFileName(file.name)
    }

    img.src = url
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file?.type.startsWith('image/')) {
        loadImage(file)
      }
    },
    [loadImage]
  )

  const clear = useCallback(() => {
    setImage(null)
    setFileName(null)
  }, [])

  return { image, fileName, handleFiles, clear }
}
