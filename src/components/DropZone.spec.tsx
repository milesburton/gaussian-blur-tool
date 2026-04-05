import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DropZone } from './DropZone'

describe('DropZone', () => {
  it('renders the drop zone with instructions', () => {
    render(<DropZone onFiles={vi.fn()} />)
    expect(screen.getByText(/drop an image here/i)).toBeInTheDocument()
  })

  it('renders as a button element', () => {
    render(<DropZone onFiles={vi.fn()} />)
    expect(screen.getByTestId('drop-zone').tagName).toBe('BUTTON')
  })

  it('creates a file input on click', async () => {
    const user = userEvent.setup()
    const onFiles = vi.fn()
    render(<DropZone onFiles={onFiles} />)

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    await user.click(screen.getByTestId('drop-zone'))
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('handles drag over state', async () => {
    const onFiles = vi.fn()
    const { getByTestId } = render(<DropZone onFiles={onFiles} />)
    const dropZone = getByTestId('drop-zone')

    await fireEvent.dragOver(dropZone)

    expect(dropZone.className).toContain('border-blue-500')
  })

  it('handles drop event', () => {
    const onFiles = vi.fn()
    const { getByTestId } = render(<DropZone onFiles={onFiles} />)
    const dropZone = getByTestId('drop-zone')

    const mockFiles = [new File(['test'], 'test.png', { type: 'image/png' })]
    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'preventDefault', { value: vi.fn() })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: mockFiles },
    })
    dropZone.dispatchEvent(dropEvent)

    expect(onFiles).toHaveBeenCalledWith(mockFiles)
  })
})
