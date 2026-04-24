/**
 * Глобальная инициализация для всех frontend-тестов.
 * Импортирует jest-dom матчеры и сбрасывает моки после каждого теста.
 */
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Очистка DOM после каждого теста
afterEach(() => {
  cleanup()
})

// Мок localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Мок fetch (глобальный)
global.fetch = vi.fn()
