import { useState } from 'react'
import { BlurCanvas } from '@/components/BlurCanvas'
import { BlurControls } from '@/components/BlurControls'
import { DropZone } from '@/components/DropZone'
import { useImageUpload } from '@/hooks/useImageUpload'

function App() {
  const { image, fileName, handleFiles, clear } = useImageUpload()
  const [blurRadius, setBlurRadius] = useState(15)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Gaussian Blur Tool
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select a region to blur. Your images never leave your browser.
          </p>
        </header>

        {!image ? (
          <DropZone onFiles={handleFiles} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{fileName}</span>
              <button
                type="button"
                onClick={clear}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Remove image
              </button>
            </div>
            <BlurControls radius={blurRadius} onRadiusChange={setBlurRadius} />
            <BlurCanvas image={image} blurRadius={blurRadius} />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
