import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18n from '../i18n'

// Story 11.1: the app defaults to pt-BR; tests assert the English labels, so they run in English.
// Portuguese rendering is covered by tests that switch language explicitly.
void i18n.changeLanguage('en')

// Cleanup after each test
afterEach(() => {
  cleanup()
  // Clear localStorage between tests
  localStorage.clear()
  sessionStorage.clear()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
