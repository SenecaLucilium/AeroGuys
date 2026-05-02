# Описание архитектуры системы — AeroGuys

## 1. Обзор

**AeroGuys** — трёхзвенная аналитическая платформа для мониторинга авиационного трафика, построенная на принципах разделения ответственности (Separation of Concerns) и контейнеризации.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Docker / Host                              │
│                                                                 │
│  ┌────────────┐     ┌─────────────────┐     ┌───────────────┐  │
│  │  Frontend  │────▶│    Backend      │────▶│  PostgreSQL   │  │
│  │React/Vite  │     │   FastAPI       │     │   15-alpine   │  │
│  │  :3000     │     │    :8000        │     │    :5432      │  │
│  └────────────┘     └─────────────────┘     └───────────────┘  │
│                              │                                  │
│                              ▼                                  │
│                  ┌───────────────────────┐                      │
│                  │  OpenSky Network API  │                      │
│                  │  (внешний источник)   │                      │
│                  └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

Все три сервиса объединены в одну Docker-сеть (`aeroguys-network`) и управляются через `docker-compose.yml`.

---

## 2. Уровни архитектуры

### 2.1 Уровень представления (Frontend)

**Технологии:** React 18, TypeScript, Vite, Material UI, Recharts, Leaflet

**Ответственности:**
- Отображение аналитических дашбордов
- Интерактивная карта воздушного трафика
- Инициализация загрузки данных
- Экспорт данных

**Внутренняя структура фронтенда:**

```
frontend/src/
├── api/            HTTP-клиент, типы данных
│   ├── client.ts   Базовый fetch-обёртка с обработкой ошибок
│   ├── aircraft.ts Запросы к /api/aircraft
│   ├── airports.ts Запросы к /api/airports
│   ├── realtime.ts Запросы к /api/realtime
│   ├── routes.ts   Запросы к /api/routes
│   ├── export.ts   Функции скачивания файлов
│   └── types.ts    TypeScript-типы для API-ответов
├── hooks/          React-хуки для получения данных
│   ├── useApi.ts        Базовый хук с состоянием загрузки
│   ├── useAircraft.ts   Хуки для данных ВС
│   ├── useAirports.ts   Хуки для аэропортов
│   ├── useRealtime.ts   Хуки для реального времени
│   └── useRoutes.ts     Хуки для маршрутов
├── context/
│   └── DataContext.tsx  Глобальный контекст: статус иниц., сброс
├── pages/          Страницы приложения (по одной на раздел)
├── components/     Переиспользуемые компоненты (SectionCard, DataBlock)
└── styles/         Стили (map.css для Leaflet)
```

Маршрутизация выполняется через `react-router-dom`. Боковая навигация (`NavDrawer`) присутствует на всех страницах.

---

### 2.2 Уровень приложения (Backend)

**Технологии:** Python 3.11+, FastAPI, psycopg2, Pydantic, python-dotenv

**Ответственности:**
- REST API для фронтенда
- Бизнес-логика аналитических запросов
- Интеграция с OpenSky Network API
- Управление схемой БД

**Внутренняя структура бэкенда:**

```
backend/src/
├── api/                FastAPI-приложение
│   ├── main.py         Точка входа, настройка CORS, регистрация роутеров
│   ├── dependencies.py DI-провайдеры (DatabaseManager, DatabaseQueries)
│   ├── routers/        Эндпоинты по доменам
│   │   ├── init.py         /api/init/*
│   │   ├── realtime.py     /api/realtime/*
│   │   ├── airports.py     /api/airports/*
│   │   ├── aircraft.py     /api/aircraft/*
│   │   ├── routes.py       /api/routes/*
│   │   └── export.py       /api/export/*
│   └── schemas/        Pydantic-схемы ответов
├── Analysis/
│   └── queries.py      Класс DatabaseQueries — все SQL-запросы
├── DB/
│   ├── dbManager.py    Пул соединений PostgreSQL (psycopg2)
│   ├── schema.py       Инициализация схемы из SQL-файлов
│   └── sql/            Миграционные SQL-файлы
│       ├── 001_tables.sql  Создание таблиц
│       └── 002_indexes.sql Создание индексов
├── OpenskyAPI/         Клиент OpenSky Network
│   ├── client.py       HTTP-клиент с retry-логикой
│   ├── tokenManager.py OAuth2-аутентификация
│   ├── models.py       Датаклассы StateVector, FlightData, FlightTrack
│   └── exceptions.py   Иерархия ошибок API
└── parsing/            Сбор и сохранение данных
    ├── data_collector.py  Оркестрация сбора (states + flights + tracks)
    ├── storage.py         Сохранение данных в БД
    ├── config.py          PollingConfig — параметры сбора
    └── default_configs.py Преднастроенные конфигурации (мировой охват и т.п.)
```

---

### 2.3 Уровень хранения данных (PostgreSQL)

**Технологии:** PostgreSQL 15 Alpine, psycopg2 (пул соединений)

**Ответственности:**
- Персистентное хранение данных о рейсах и позициях ВС
- Аналитические агрегации (GROUP BY, оконные функции)
- Справочник аэропортов

Подробная схема таблиц описана в документе «Описание структуры БД».

---

## 3. Потоки данных

### 3.1 Инициализация данных

```
Пользователь (Browser)
    │
    │ POST /api/init/realtime
    ▼
api/routers/init.py
    │ создаёт DataCollector
    ▼
parsing/data_collector.py
    ├─── OpenskyAPI/client.py ──▶ OpenSky Network
    │         (GET /states/all + GET /flights/all)
    │         возвращает List[StateVector], List[FlightData]
    │
    └─── parsing/storage.py ──▶ DB/dbManager.py ──▶ PostgreSQL
              (INSERT INTO snapshots, state_vectors, flights)
```

### 3.2 Аналитический запрос

```
Пользователь (Browser)
    │
    │ GET /api/airports/{icao}/peak-hours?days=7
    ▼
api/routers/airports.py
    │ depends: get_queries() → DatabaseQueries
    ▼
Analysis/queries.py :: get_airport_peak_hours()
    │ SQL-запрос к PostgreSQL
    ▼
DB/dbManager.py :: get_cursor()
    │
    ▼
PostgreSQL (таблицы flights, airports)
    │
    └─── JSON-ответ ──▶ Browser
```

### 3.3 Экспорт данных

```
Пользователь (Browser)
    │
    │ GET /api/export/analytics
    ▼
api/routers/export.py
    │ формирует ZIP в памяти (io.BytesIO)
    │ несколько SELECT-запросов к PostgreSQL
    ▼
StreamingResponse (ZIP/CSV) ──▶ Browser
```

---

## 4. Компоненты и зависимости

### 4.1 Граф зависимостей бэкенда

```
api/main.py
  └── api/routers/* (6 модулей)
        └── api/dependencies.py
              ├── DB/dbManager.py (DatabaseManager)
              │     └── psycopg2 → PostgreSQL
              └── Analysis/queries.py (DatabaseQueries)

api/routers/init.py (дополнительно)
  └── parsing/data_collector.py
        ├── OpenskyAPI/client.py
        │     └── OpenskyAPI/tokenManager.py (OAuth2)
        └── parsing/storage.py
              └── DB/dbManager.py
```

### 4.2 Внедрение зависимостей (Dependency Injection)

FastAPI использует механизм `Depends` для управления зависимостями:

```python
# api/dependencies.py
def get_queries() -> DatabaseQueries:
    return DatabaseQueries(_get_db_manager())

# В роутере:
def endpoint(queries: DatabaseQueries = Depends(get_queries)):
    ...
```

`DatabaseManager` создаётся один раз при запуске (singleton через глобальную переменную) и переиспользуется в рамках пула соединений (1–20 соединений).

---

## 5. Конфигурация и окружение

### 5.1 Переменные окружения

| Переменная              | Описание                           | Обязательно |
|-------------------------|------------------------------------|:-----------:|
| `DB_HOST`               | Хост PostgreSQL                    | ✓           |
| `DB_PORT`               | Порт PostgreSQL (обычно 5432)      | ✓           |
| `DB_NAME`               | Имя базы данных                    | ✓           |
| `DB_USER`               | Пользователь БД                    | ✓           |
| `DB_PASSWORD`           | Пароль пользователя БД             | ✓           |
| `OPENSKY_CLIENT_ID`     | Client ID для OpenSky Network OAuth| ✓ (для сбора) |
| `OPENSKY_CLIENT_SECRET` | Client Secret для OpenSky          | ✓ (для сбора) |

### 5.2 Docker-конфигурация

Сервисы определены в `docker-compose.yml`:

| Сервис     | Образ           | Внутренний порт | Внешний порт |
|------------|-----------------|-----------------|-------------|
| `frontend` | Кастомный (Vite → nginx) | 80  | 3000        |
| `backend`  | Кастомный (Python/uvicorn) | 8000 | 8000     |
| `postgres` | `postgres:15-alpine` | 5432         | 5433        |

Бэкенд ожидает готовности PostgreSQL (healthcheck) перед стартом (`depends_on: condition: service_healthy`).

---

## 6. Безопасность

- **CORS:** Настроен явный список разрешённых источников (`http://localhost:3000`). В продакшне заменяется реальным доменом фронтенда.
- **SQL-инъекции:** Все запросы используют параметризованные запросы psycopg2 (никакой конкатенации строк с параметрами).
- **Учётные данные:** Передаются исключительно через переменные окружения, файл `.env` исключён из системы контроля версий (`.gitignore`).
- **Пул соединений:** `psycopg2.pool.SimpleConnectionPool` ограничивает максимальное число соединений с БД до 20.
- **Retry-логика:** OpenskyClient имеет автоматические повторные попытки (до 3-х) на ошибки 500/502/503/504 с экспоненциальным backoff.

---

## 7. Масштабируемость и расширяемость

- Новые аналитические эндпоинты добавляются путём:
  1. Написания SQL-метода в `Analysis/queries.py`
  2. Добавления Pydantic-схемы в `api/schemas/`
  3. Регистрации маршрута в соответствующем роутере или новом модуле роутера
  4. Регистрации нового роутера в `api/main.py`

- Хранение данных расширяется через новые SQL-миграции в `backend/src/DB/sql/` (файлы с числовым префиксом применяются в алфавитном порядке).

- Фронтенд расширяется через новые страницы в `frontend/src/pages/` с соответствующим API-модулем и хуками.
