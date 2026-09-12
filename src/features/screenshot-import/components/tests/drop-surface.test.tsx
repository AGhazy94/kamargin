// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { DropSurface } from '../drop-surface'

afterEach(cleanup)

function png(name: string) {
  return new File(['image'], name, { type: 'image/png' })
}

function fileList(...files: File[]) {
  return {
    ...files,
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* files
    },
  } as unknown as FileList
}

function dragEvent(type: string, files: File[], types = ['Files']) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { types, files: fileList(...files) },
  })
  return event
}

function pasteEvent(files: File[]) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: { files: fileList(...files) },
  })
  return event
}

it('cancels a drag so the browser never navigates to the dropped file', () => {
  render(<DropSurface onFiles={vi.fn()} />)

  const over = dragEvent('dragover', [])
  act(() => {
    window.dispatchEvent(over)
  })

  expect(over.defaultPrevented).toBe(true)
})

it('shows the drop zone only while files are over the page', () => {
  render(<DropSurface onFiles={vi.fn()} />)
  expect(screen.queryByText('Drop screenshots here')).toBeNull()

  act(() => {
    window.dispatchEvent(dragEvent('dragenter', []))
  })
  expect(screen.getByText('Drop screenshots here')).toBeTruthy()

  act(() => {
    window.dispatchEvent(dragEvent('dragleave', []))
  })
  expect(screen.queryByText('Drop screenshots here')).toBeNull()
})

it('ignores a drag that carries no files', () => {
  render(<DropSurface onFiles={vi.fn()} />)

  act(() => {
    window.dispatchEvent(dragEvent('dragenter', [], ['text/plain']))
  })

  expect(screen.queryByText('Drop screenshots here')).toBeNull()
})

it('delivers dropped images and hides the drop zone', () => {
  const onFiles = vi.fn()
  render(<DropSurface onFiles={onFiles} />)

  act(() => {
    window.dispatchEvent(dragEvent('dragenter', []))
    window.dispatchEvent(
      dragEvent('drop', [png('market.png'), png('other.png')]),
    )
  })

  expect(onFiles.mock.calls[0]?.[0].map((file: File) => file.name)).toEqual([
    'market.png',
    'other.png',
  ])
  expect(screen.queryByText('Drop screenshots here')).toBeNull()
})

it('drops non-image files from the batch', () => {
  const onFiles = vi.fn()
  render(<DropSurface onFiles={onFiles} />)
  const notes = new File(['notes'], 'notes.txt', { type: 'text/plain' })

  act(() => {
    window.dispatchEvent(dragEvent('drop', [notes, png('market.png')]))
  })

  expect(onFiles.mock.calls[0]?.[0].map((file: File) => file.name)).toEqual([
    'market.png',
  ])
})

it('imports a pasted image', () => {
  const onFiles = vi.fn()
  render(<DropSurface onFiles={onFiles} />)

  const paste = pasteEvent([png('clipboard.png')])
  act(() => {
    window.dispatchEvent(paste)
  })

  expect(paste.defaultPrevented).toBe(true)
  expect(onFiles.mock.calls[0]?.[0].map((file: File) => file.name)).toEqual([
    'clipboard.png',
  ])
})

it('leaves a text paste to the focused field', () => {
  const onFiles = vi.fn()
  render(<DropSurface onFiles={onFiles} />)

  const paste = pasteEvent([])
  act(() => {
    window.dispatchEvent(paste)
  })

  expect(paste.defaultPrevented).toBe(false)
  expect(onFiles).not.toHaveBeenCalled()
})

it('stops listening once unmounted', () => {
  const onFiles = vi.fn()
  const view = render(<DropSurface onFiles={onFiles} />)
  view.unmount()

  act(() => {
    window.dispatchEvent(dragEvent('drop', [png('market.png')]))
  })

  expect(onFiles).not.toHaveBeenCalled()
})
