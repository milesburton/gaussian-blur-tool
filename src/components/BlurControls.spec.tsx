import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BlurControls } from './BlurControls'

const defaultProps = {
  radius: 15,
  onRadiusChange: vi.fn(),
  detectQuery: '',
  onDetectQueryChange: vi.fn(),
}

describe('BlurControls', () => {
  it('renders the blur radius label', () => {
    render(<BlurControls {...defaultProps} />)
    expect(screen.getByText('Blur Radius')).toBeInTheDocument()
  })

  it('displays the current radius value', () => {
    render(<BlurControls {...defaultProps} radius={25} />)
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('renders a range input with correct attributes', () => {
    render(<BlurControls {...defaultProps} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '1')
    expect(slider).toHaveAttribute('max', '50')
    expect(slider).toHaveValue('15')
  })

  it('calls onRadiusChange when slider value changes', () => {
    const onRadiusChange = vi.fn()
    render(<BlurControls {...defaultProps} onRadiusChange={onRadiusChange} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '20' } })

    expect(onRadiusChange).toHaveBeenCalledWith(20)
  })

  it('renders the auto-detect input', () => {
    render(<BlurControls {...defaultProps} />)
    expect(screen.getByTestId('detect-query')).toBeInTheDocument()
    expect(screen.getByText('Auto-Detect')).toBeInTheDocument()
  })

  it('calls onDetectQueryChange when typing in detect query', async () => {
    const user = userEvent.setup()
    const onDetectQueryChange = vi.fn()
    render(<BlurControls {...defaultProps} onDetectQueryChange={onDetectQueryChange} />)

    await user.type(screen.getByTestId('detect-query'), 'laptop')
    expect(onDetectQueryChange).toHaveBeenCalled()
  })
})
