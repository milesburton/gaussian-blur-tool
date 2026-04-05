import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlurControls } from './BlurControls'

describe('BlurControls', () => {
  it('renders the blur radius label', () => {
    render(<BlurControls radius={15} onRadiusChange={vi.fn()} />)
    expect(screen.getByText('Blur Radius')).toBeInTheDocument()
  })

  it('displays the current radius value', () => {
    render(<BlurControls radius={25} onRadiusChange={vi.fn()} />)
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('renders a range input with correct attributes', () => {
    render(<BlurControls radius={15} onRadiusChange={vi.fn()} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '1')
    expect(slider).toHaveAttribute('max', '50')
    expect(slider).toHaveValue('15')
  })

  it('calls onRadiusChange when slider value changes', () => {
    const onRadiusChange = vi.fn()
    render(<BlurControls radius={15} onRadiusChange={onRadiusChange} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '20' } })

    expect(onRadiusChange).toHaveBeenCalledWith(20)
  })
})
