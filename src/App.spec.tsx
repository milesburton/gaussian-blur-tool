import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('Gaussian Blur Tool')).toBeInTheDocument()
  })

  it('renders the privacy message', () => {
    render(<App />)
    expect(screen.getByText(/images never leave your browser/i)).toBeInTheDocument()
  })

  it('shows the drop zone when no image is loaded', () => {
    render(<App />)
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument()
  })
})
