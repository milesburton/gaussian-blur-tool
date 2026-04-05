import type { SelectionMode } from '@/types'

interface BlurControlsProps {
  radius: number
  onRadiusChange: (radius: number) => void
  selectionMode: SelectionMode
  onSelectionModeChange: (mode: SelectionMode) => void
}

const modeLabels: Record<SelectionMode, string> = {
  rectangle: 'Rectangle',
  freeform: 'Freeform',
  detect: 'Auto-Detect',
}

export function BlurControls({
  radius,
  onRadiusChange,
  selectionMode,
  onSelectionModeChange,
}: BlurControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <label
          htmlFor="blur-radius"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Blur Radius
        </label>
        <input
          id="blur-radius"
          type="range"
          min={1}
          max={50}
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">{radius}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tool</span>
        <div className="flex gap-1">
          {(Object.keys(modeLabels) as SelectionMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={selectionMode === mode}
              onClick={() => onSelectionModeChange(mode)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectionMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
