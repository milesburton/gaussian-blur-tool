import { SAMPLES, type SampleImage, sampleUrl } from '@/lib/samples'

interface SampleGalleryProps {
  onSelect: (sample: SampleImage) => void
}

export function SampleGallery({ onSelect }: SampleGalleryProps) {
  return (
    <div className="flex flex-col gap-3" data-testid="sample-gallery">
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">or try a sample image</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => onSelect(sample)}
            data-testid={`sample-${sample.id}`}
            aria-label={`Try sample: ${sample.description}`}
            className="group flex flex-col items-stretch rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
          >
            <img
              src={sampleUrl(sample)}
              alt={sample.description}
              className="w-full h-24 object-cover"
              loading="lazy"
            />
            <span className="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950">
              {sample.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
