/** Минимальный компонент отображения состояния API-запроса. */
interface DataBlockProps<T> {
  title: string
  loading: boolean
  error: string | null
  data: T | null
  refetch: () => void
}

export function DataBlock<T>({ title, loading, error, data, refetch }: DataBlockProps<T>) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {title}
        <button onClick={refetch} style={{ fontSize: 12, padding: '2px 8px' }}>
          Обновить
        </button>
      </h2>

      {loading && <p>Загрузка…</p>}
      {error   && <p style={{ color: 'red' }}>Ошибка: {error}</p>}
      {data    && (
        <pre style={{ background: '#111', color: '#0f0', padding: 12, overflow: 'auto', maxHeight: 300, fontSize: 12 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  )
}
