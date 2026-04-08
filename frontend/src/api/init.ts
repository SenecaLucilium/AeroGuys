import client from './client'

export interface InitResult {
  states_loaded: number
  flights_loaded: number
  message: string
}

/** Запускает один цикл сбора real-time данных из OpenSky API. */
export async function initRealtime(): Promise<InitResult> {
  const { data } = await client.post<InitResult>('/api/init/realtime', null, {
    timeout: 120_000, // API-запрос может занять до 2 минут
  })
  return data
}

/** Загружает CSV-файл с рейсами на сервер для парсинга и сохранения в БД. */
export async function initUploadCsv(file: File): Promise<InitResult> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await client.post<InitResult>('/api/init/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  })
  return data
}
