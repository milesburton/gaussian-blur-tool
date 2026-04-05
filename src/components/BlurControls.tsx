interface BlurControlsProps {
  radius: number
  onRadiusChange: (radius: number) => void
}

export function BlurControls({ radius, onRadiusChange }: BlurControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <label htmlFor="blur-radius" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
  )
}
