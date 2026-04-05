import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useHistory } from './useHistory'

function createImageData(value: number): ImageData {
  const data = new Uint8ClampedArray(4)
  data[0] = value
  data[1] = value
  data[2] = value
  data[3] = 255
  return new ImageData(data, 1, 1)
}

describe('useHistory', () => {
  it('starts with undo/redo disabled', () => {
    const { result } = renderHook(() => useHistory())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('enables undo after pushing state', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.pushState(createImageData(100))
    })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo returns the previous state', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.pushState(createImageData(100))
    })

    const ref: { value: ImageData | null } = { value: null }
    act(() => {
      ref.value = result.current.undo(createImageData(200))
    })

    expect(ref.value).not.toBeNull()
    expect(ref.value?.data[0]).toBe(100)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('redo returns the next state after undo', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.pushState(createImageData(100))
    })
    act(() => {
      result.current.undo(createImageData(200))
    })

    const ref: { value: ImageData | null } = { value: null }
    act(() => {
      ref.value = result.current.redo(createImageData(100))
    })

    expect(ref.value).not.toBeNull()
    expect(ref.value?.data[0]).toBe(200)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.canUndo).toBe(true)
  })

  it('pushing state clears the redo stack', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.pushState(createImageData(100))
    })
    act(() => {
      result.current.undo(createImageData(200))
    })

    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.pushState(createImageData(300))
    })
    expect(result.current.canRedo).toBe(false)
  })

  it('clear resets all history', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.pushState(createImageData(100))
    })
    act(() => {
      result.current.pushState(createImageData(200))
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('respects max size limit', () => {
    const { result } = renderHook(() => useHistory(3))

    act(() => {
      result.current.pushState(createImageData(1))
    })
    act(() => {
      result.current.pushState(createImageData(2))
    })
    act(() => {
      result.current.pushState(createImageData(3))
    })
    act(() => {
      result.current.pushState(createImageData(4))
    })

    // Undo 3 times — should succeed
    act(() => {
      result.current.undo(createImageData(0))
    })
    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.undo(createImageData(0))
    })
    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.undo(createImageData(0))
    })
    // After 3 undos, should be at the limit
    expect(result.current.canUndo).toBe(false)
  })

  it('undo returns null when nothing to undo', () => {
    const { result } = renderHook(() => useHistory())
    let undone: ImageData | null = null
    act(() => {
      undone = result.current.undo(createImageData(100))
    })
    expect(undone).toBeNull()
  })

  it('redo returns null when nothing to redo', () => {
    const { result } = renderHook(() => useHistory())
    let redone: ImageData | null = null
    act(() => {
      redone = result.current.redo(createImageData(100))
    })
    expect(redone).toBeNull()
  })
})
