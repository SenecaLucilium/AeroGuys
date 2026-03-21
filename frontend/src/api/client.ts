import axios from 'axios'

/**
 * Базовый axios-инстанс.
 * В dev-режиме Vite proxy перенаправляет /api/* → http://localhost:8000/api/*
 * В prod переменная VITE_API_BASE_URL задаётся в .env
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Глобальный перехватчик ошибок — логируем в консоль, пробрасываем дальше
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      console.error('[API Error]', error.response?.status, error.response?.data ?? error.message)
    }
    return Promise.reject(error)
  },
)

export default apiClient
