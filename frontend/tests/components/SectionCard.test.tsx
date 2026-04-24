/**
 * Тесты компонента SectionCard (DataBlock.tsx).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { SectionCard } from '../../src/components/DataBlock'

describe('SectionCard', () => {
  const defaultProps = {
    title: 'Test Title',
    loading: false,
    error: null,
    refetch: vi.fn(),
  }

  it('отображает заголовок', () => {
    render(React.createElement(SectionCard, defaultProps))
    expect(screen.getByText('Test Title')).toBeDefined()
  })

  it('отображает скелетоны при loading=true', () => {
    render(React.createElement(SectionCard, { ...defaultProps, loading: true }))
    // При загрузке не выводится ошибка и нет children
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('отображает ошибку при error != null', () => {
    render(
      React.createElement(SectionCard, {
        ...defaultProps,
        error: 'Что-то пошло не так',
      })
    )
    expect(screen.getByText('Что-то пошло не так')).toBeDefined()
  })

  it('не отображает ошибку при loading=true (приоритет загрузки)', () => {
    render(
      React.createElement(SectionCard, {
        ...defaultProps,
        loading: true,
        error: 'ошибка',
      })
    )
    // При loading Alert не показывается
    expect(screen.queryByText('ошибка')).toBeNull()
  })

  it('отображает children при loading=false и error=null', () => {
    render(
      React.createElement(SectionCard, defaultProps,
        React.createElement('div', null, 'Дочерний элемент')
      )
    )
    expect(screen.getByText('Дочерний элемент')).toBeDefined()
  })

  it('не отображает children при загрузке', () => {
    render(
      React.createElement(SectionCard, { ...defaultProps, loading: true },
        React.createElement('div', null, 'Контент')
      )
    )
    expect(screen.queryByText('Контент')).toBeNull()
  })

  it('отображает счётчик (count) если передан', () => {
    render(React.createElement(SectionCard, { ...defaultProps, count: 42 }))
    expect(screen.getByText('42')).toBeDefined()
  })

  it('не отображает счётчик если count не передан', () => {
    render(React.createElement(SectionCard, defaultProps))
    // Чипа с числом быть не должно
    expect(screen.queryByText(/^\d+$/)).toBeNull()
  })

  it('кнопка Обновить вызывает refetch', () => {
    const refetch = vi.fn()
    render(React.createElement(SectionCard, { ...defaultProps, refetch }))

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('кнопка Обновить задизаблена при loading=true', () => {
    render(React.createElement(SectionCard, { ...defaultProps, loading: true }))
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('disabled')
  })
})
