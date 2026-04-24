# Тестирование системы AeroGuys

## Структура тестов

```
AeroGuys/
├── run_tests.sh                      # единая точка запуска всех тестов
│
├── backend/
│   ├── pytest.ini                    # конфигурация pytest
│   ├── tests/
│   │   ├── conftest.py               # общие фикстуры, моки, фабрики данных
│   │   ├── unit/
│   │   │   ├── test_models.py        # тесты доменных моделей (dataclass)
│   │   │   └── test_schemas.py       # тесты Pydantic-схем
│   │   ├── api/
│   │   │   ├── test_health.py        # GET /api/health
│   │   │   ├── test_init.py          # GET|POST /api/init/*
│   │   │   ├── test_realtime.py      # GET /api/realtime/*
│   │   │   ├── test_airports.py      # GET /api/airports/*
│   │   │   ├── test_aircraft.py      # GET /api/aircraft/*
│   │   │   ├── test_routes.py        # GET /api/routes/*
│   │   │   └── test_export.py        # GET /api/export/*
│   │   └── integration/
│   │       └── test_api_integration.py  # тесты с реальной БД
│   │
│   └── docs/
│       ├── generate_openapi.py       # генератор openapi.json + openapi.yaml + api_reference.md
│       ├── generate_postman.py       # генератор Postman-коллекции
│       ├── openapi.json              # OpenAPI 3.x схема (авто)
│       ├── openapi.yaml              # то же в YAML (авто)
│       ├── api_reference.md          # справочник в Markdown (авто)
│       └── AeroGuys_API.postman_collection.json  # Postman-коллекция (авто)
│
└── frontend/
    ├── vitest.config.ts              # конфигурация Vitest
    └── tests/
        ├── setup.ts                  # глобальная инициализация тестов
        ├── hooks/
        │   ├── useApi.test.ts        # тесты хука useApi
        │   └── useDataContext.test.tsx # тесты DataContext
        ├── api/
        │   ├── aircraft.test.ts      # мок-тесты API aircraft.ts
        │   ├── airports.test.ts      # мок-тесты API airports.ts
        │   └── realtime.test.ts      # мок-тесты API realtime.ts
        └── components/
            └── SectionCard.test.tsx  # тесты компонента SectionCard
```

---

## 0. Подготовка окружения

### Backend

```bash
# Создать виртуальное окружение (если его нет)
python -m venv venv
source venv/bin/activate

# Установить зависимости для разработки
pip install -r requirements.txt
pip install pytest pytest-cov httpx
```

### Frontend

```bash
cd frontend
npm install
```

---

## 1. Быстрый запуск (рекомендуется)

```bash
# Все тесты (unit + api + frontend), без интеграционных
./run_tests.sh

# Только backend
./run_tests.sh --backend

# Только frontend
./run_tests.sh --frontend

# С отчётом о покрытии кода
./run_tests.sh --coverage

# Все тесты включая интеграционные (требуется запущенный PostgreSQL)
./run_tests.sh --all
```

---

## 2. Backend тесты (pytest)

### Юнит-тесты

Тестируют изолированные компоненты без зависимостей от БД:

```bash
cd backend
source ../venv/bin/activate

# Запуск юнит-тестов
python -m pytest tests/unit/ -v

# С покрытием
python -m pytest tests/unit/ --cov=src --cov-report=term-missing
```

**Что тестируется:**
- `tests/unit/test_models.py` — парсинг строк БД в `AircraftPosition` и `FlightInfo` (21 тест)
- `tests/unit/test_schemas.py` — Pydantic-схемы: обязательные поля, опциональные, типы (18 тестов)

### API тесты (функциональные)

Используют FastAPI `TestClient` с **мокнутой** базой данных:

```bash
python -m pytest tests/api/ -v
```

**Что тестируется:**
| Файл | Эндпоинты | Тесты |
|------|-----------|-------|
| `test_health.py` | `GET /api/health`, `GET /api/openapi.json`, `GET /api/docs` | 6 |
| `test_init.py` | `GET /api/init/status`, `POST /api/init/realtime`, `POST /api/init/upload-csv` | 8 |
| `test_realtime.py` | `GET /api/realtime/*` (airport-busyness, city-busyness, fastest, highest) | 16 |
| `test_airports.py` | `GET /api/airports/*` (stats, info, peak-hours, destinations, daily-trend, throughput) | 19 |
| `test_aircraft.py` | `GET /api/aircraft/*` (positions, by-callsign, types, distributions, icao24/\*) | 38 |
| `test_routes.py` | `GET /api/routes/*` (popular, efficiency, duration-distribution, airlines) | 18 |
| `test_export.py` | `GET /api/export/*` (flights, raw, analytics) | 9 |

**Типы сценариев:**
- `200 OK` с проверкой схемы ответа
- `404 Not Found` — объект не найден
- `422 Unprocessable Entity` — невалидные параметры (границы, обязательные поля)
- Forwarding параметров в методы `DatabaseQueries`

### Все backend тесты (без интеграционных)

```bash
python -m pytest tests/ --ignore=tests/integration -v

# С HTML-отчётом покрытия
python -m pytest tests/ --ignore=tests/integration \
    --cov=src --cov-report=html:coverage_html
# Откройте coverage_html/index.html в браузере
```

---

## 3. Интеграционные тесты (с реальной БД)

Требуют запущенного PostgreSQL. Запускаются **только** при `INTEGRATION_TESTS=1`:

```bash
# Поднять только PostgreSQL
docker compose up postgres -d

# Запустить интеграционные тесты
INTEGRATION_TESTS=1 python -m pytest tests/integration/ -v

# Или через run_tests.sh
./run_tests.sh --all
```

**Что тестируется:**
- Реальный health check против живого приложения
- Статус пустой БД через `/api/init/status`
- Вставка данных и проверка отображения через `/api/aircraft/positions`
- Export CSV с реальным SQL-запросом
- Наличие всех роутов в OpenAPI-схеме

---

## 4. Frontend тесты (Vitest)

```bash
cd frontend

# Однократный запуск
npm run test

# Watch-режим (перезапуск при изменении файлов)
npm run test:watch

# С покрытием
npm run test:coverage
# Отчёт: frontend/coverage/index.html
```

**Что тестируется:**

| Файл | Описание | Тестов |
|------|----------|--------|
| `useApi.test.ts` | Хук `useApi`: loading, success, error, refetch, deps | 7 |
| `useDataContext.test.tsx` | `DataContext`: init, reset, localStorage, fetch-check | 7 |
| `aircraft.test.ts` | API-функции самолётов: URL, параметры, ошибки | 7 |
| `airports.test.ts` | API-функции аэропортов: URL, параметры | 11 |
| `realtime.test.ts` | API-функции реального времени | 6 |
| `SectionCard.test.tsx` | Компонент: loading, error, count, refetch button | 10 |

---

## 5. API документация

### Интерактивная документация (при запущенном сервере)

```
Swagger UI:       http://localhost:8000/api/docs
ReDoc:            http://localhost:8000/api/redoc
OpenAPI JSON:     http://localhost:8000/api/openapi.json
```

### Генерация статических файлов

```bash
cd backend
source ../venv/bin/activate

# Генерация openapi.json + openapi.yaml + api_reference.md
python docs/generate_openapi.py

# Генерация Postman-коллекции
python docs/generate_postman.py
```

Файлы сохраняются в `backend/docs/`:
- `openapi.json` — импортируется в Swagger UI, Insomnia, Postman
- `openapi.yaml` — альтернативный формат
- `api_reference.md` — справочник для чтения в GitHub/GitLab
- `AeroGuys_API.postman_collection.json` — готовая коллекция с переменной `BASE_URL`

**Импорт в Postman:**
1. File → Import → выбрать `AeroGuys_API.postman_collection.json`
2. Создать Environment с переменной `BASE_URL = http://localhost:8000`

---

## 6. Тестовые сценарии

### Сценарий 1: Проверка работоспособности после запуска

```bash
# Поднять систему
docker compose up -d

# Подождать готовности
sleep 10

# Smoke-test
curl -sf http://localhost:8000/api/health | python3 -m json.tool
# Ожидаем: {"status": "ok"}
```

### Сценарий 2: Загрузка данных через CSV

1. Перейти на `http://localhost:3000/init`
2. Выбрать CSV-файл (формат: `icao24,callsign,firstSeen,estDepartureAirport,lastSeen,estArrivalAirport`)
3. Нажать «Загрузить»
4. Убедиться, что статус изменился на «Данные загружены»

### Сценарий 3: Проверка API эндпоинтов

```bash
BASE=http://localhost:8000

# Health
curl -s $BASE/api/health

# Статус данных
curl -s $BASE/api/init/status | python3 -m json.tool

# Позиции самолётов
curl -s "$BASE/api/aircraft/positions?limit=5" | python3 -m json.tool

# Самые быстрые
curl -s "$BASE/api/realtime/fastest?limit=3" | python3 -m json.tool

# Экспорт CSV
curl -s "$BASE/api/export/flights?start=2026-01-01T00:00:00&end=2026-12-31T23:59:59" \
    -o flights.csv && head flights.csv
```

### Сценарий 4: Граничные значения параметров

```bash
# Невалидная широта → 422
curl -s "$BASE/api/aircraft/positions?min_lat=200" | python3 -m json.tool

# Превышение лимита → 422
curl -s "$BASE/api/realtime/fastest?limit=5000" | python3 -m json.tool

# Несуществующий аэропорт → 404
curl -s "$BASE/api/airports/XXXX/info" | python3 -m json.tool
```

---

## 7. Метрики покрытия

После запуска с `--coverage`:

```
backend/coverage_html/index.html  — HTML-отчёт покрытия backend
frontend/coverage/index.html      — HTML-отчёт покрытия frontend
```

**Текущее покрытие:**
- Backend (unit + api): ~145 тестов
- Frontend: ~48 тестов
- Итого: ~193 автоматических теста

---

## 8. CI/CD

Добавьте в `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt pytest pytest-cov httpx
      - run: |
          cd backend
          python -m pytest tests/ --ignore=tests/integration -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd frontend && npm ci --legacy-peer-deps
      - run: cd frontend && npm run test
```
