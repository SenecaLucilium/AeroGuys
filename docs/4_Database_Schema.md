# Описание структуры базы данных — AeroGuys

## 1. Общие сведения

**СУБД:** PostgreSQL 15  
**Схема:** `public` (по умолчанию)  
**Кодировка:** UTF-8  

База данных содержит **6 таблиц** и **27 индексов**, оптимизированных под аналитические запросы. Схема создаётся автоматически при первом запуске через SQL-миграции в `backend/src/DB/sql/`.

---

## 2. Диаграмма таблиц (ER-схема)

```
┌──────────────┐       ┌────────────────────┐
│   airports   │       │     snapshots      │
│─────────────│        │────────────────────│
│ icao (PK)    │        │ id (PK, BIGSERIAL) │
│ name         │        │ api_timestamp      │
│ latitude     │        │ aircraft_count     │
│ longitude    │        │ bbox_lat_min/max   │
│ country      │        │ bbox_lon_min/max   │
│ city         │        │ created_at         │
└──────────────┘        └────────────────────┘
       │                         │
       │ (est_departure_airport, │ (snapshot_id FK)
       │  est_arrival_airport)   │
       │                         ▼
┌──────────────┐        ┌────────────────────┐
│   flights    │        │   state_vectors    │
│──────────────│        │────────────────────│
│ id (PK)      │        │ id (PK, BIGSERIAL) │
│ icao24       │        │ snapshot_id (FK)   │
│ callsign     │        │ icao24             │
│ first_seen   │        │ callsign           │
│ last_seen    │        │ origin_country     │
│ est_dep_ap   │        │ time_position      │
│ est_arr_ap   │        │ last_contact       │
│ ...          │        │ longitude          │
│ collected_at │        │ latitude           │
└──────────────┘        │ baro_altitude      │
                        │ geo_altitude       │
                        │ on_ground          │
┌──────────────────┐    │ velocity           │
│  flight_tracks   │    │ true_track         │
│──────────────────│    │ vertical_rate      │
│ id (PK)          │    │ squawk             │
│ icao24           │    │ spi                │
│ callsign         │    │ position_source    │
│ start_time       │    │ category           │
│ end_time         │    └────────────────────┘
│ collected_at     │
└──────────────────┘
         │ (flight_track_id FK)
         ▼
┌────────────────┐
│   waypoints    │
│────────────────│
│ id (PK)        │
│ flight_track_id│
│ time           │
│ latitude       │
│ longitude      │
│ baro_altitude  │
│ true_track     │
│ on_ground      │
└────────────────┘
```

---

## 3. Описание таблиц

### 3.1 `airports` — Справочник аэропортов

Статический справочник аэропортов. Используется для обогащения данных рейсов географической информацией.

| Столбец     | Тип                | Ограничения  | Описание                        |
|-------------|--------------------|--------------|---------------------------------|
| `icao`      | `VARCHAR(4)`       | PRIMARY KEY  | ICAO-код аэропорта (4 символа)  |
| `name`      | `VARCHAR(200)`     |              | Официальное название аэропорта  |
| `latitude`  | `DOUBLE PRECISION` | NOT NULL     | Широта аэропорта, градусы       |
| `longitude` | `DOUBLE PRECISION` | NOT NULL     | Долгота аэропорта, градусы      |
| `country`   | `VARCHAR(100)`     |              | Страна расположения             |
| `city`      | `VARCHAR(100)`     |              | Город расположения              |

**Индексы:**
- `idx_airports_position` — на `(latitude, longitude)` — для геопространственных запросов
- `idx_airports_country` — на `(country)` — для группировки по странам

---

### 3.2 `snapshots` — Снимки состояния воздушного трафика

Каждая строка соответствует одному вызову OpenSky API (`/states/all`). Является родительской сущностью для `state_vectors`.

| Столбец          | Тип                | Ограничения             | Описание                                 |
|------------------|--------------------|-------------------------|------------------------------------------|
| `id`             | `BIGSERIAL`        | PRIMARY KEY             | Автоинкрементный идентификатор           |
| `api_timestamp`  | `BIGINT`           | NOT NULL                | Unix-timestamp ответа OpenSky API        |
| `aircraft_count` | `INTEGER`          | NOT NULL, DEFAULT 0     | Число ВС в снапшоте                      |
| `bbox_lat_min`   | `DOUBLE PRECISION` |                         | Нижняя граница широты запрошенного bbox  |
| `bbox_lat_max`   | `DOUBLE PRECISION` |                         | Верхняя граница широты                   |
| `bbox_lon_min`   | `DOUBLE PRECISION` |                         | Левая граница долготы                    |
| `bbox_lon_max`   | `DOUBLE PRECISION` |                         | Правая граница долготы                   |
| `created_at`     | `TIMESTAMPTZ`      | NOT NULL, DEFAULT NOW() | Время записи в БД                        |

**Индексы:**
- `idx_snapshots_api_ts` — на `(api_timestamp)` — для поиска последнего снапшота

---

### 3.3 `state_vectors` — Векторы состояния воздушных судов

Основная таблица реального времени. Каждая строка — состояние одного ВС в момент конкретного снапшота. Удаляется каскадно при удалении снапшота.

| Столбец           | Тип                | Ограничения                        | Описание                              |
|-------------------|--------------------|------------------------------------|---------------------------------------|
| `id`              | `BIGSERIAL`        | PRIMARY KEY                        | Автоинкрементный идентификатор        |
| `snapshot_id`     | `BIGINT`           | NOT NULL, FK → `snapshots(id)` CASCADE | Привязка к снапшоту             |
| `icao24`          | `VARCHAR(6)`       | NOT NULL                           | 24-битный ICAO-адрес транспондера     |
| `callsign`        | `VARCHAR(8)`       |                                    | Позывной (может быть NULL)            |
| `origin_country`  | `VARCHAR(100)`     | NOT NULL                           | Страна регистрации ВС                 |
| `time_position`   | `BIGINT`           |                                    | Unix-timestamp последней позиции      |
| `last_contact`    | `BIGINT`           | NOT NULL                           | Unix-timestamp последнего контакта    |
| `longitude`       | `DOUBLE PRECISION` |                                    | Долгота, градусы (WGS-84)             |
| `latitude`        | `DOUBLE PRECISION` |                                    | Широта, градусы (WGS-84)              |
| `baro_altitude`   | `DOUBLE PRECISION` |                                    | Барометрическая высота, метры         |
| `geo_altitude`    | `DOUBLE PRECISION` |                                    | Геометрическая высота, метры          |
| `on_ground`       | `BOOLEAN`          | NOT NULL, DEFAULT FALSE            | `true` — на земле                     |
| `velocity`        | `DOUBLE PRECISION` |                                    | Скорость, м/с                         |
| `true_track`      | `DOUBLE PRECISION` |                                    | Истинный курс, градусы от севера (0–360) |
| `vertical_rate`   | `DOUBLE PRECISION` |                                    | Вертикальная скорость, м/с (+набор, −снижение) |
| `squawk`          | `VARCHAR(4)`       |                                    | Код транспондера (4 цифры)            |
| `spi`             | `BOOLEAN`          | NOT NULL, DEFAULT FALSE            | Special Purpose Indicator             |
| `position_source` | `SMALLINT`         | NOT NULL, DEFAULT 0                | Источник позиции: 0=ADS-B, 1=ASTERIX, 2=MLAT, 3=FLARM |
| `category`        | `SMALLINT`         | NOT NULL, DEFAULT 0                | Категория ВС (ADS-B, см. ниже)        |

**Значения `category` (AircraftCategory):**

| Значение | Название                 | Описание                     |
|---------|--------------------------|------------------------------|
| 1       | NO_ADS_B_INFO            | Нет информации ADS-B         |
| 2       | LIGHT                    | Лёгкое ВС (< 15 500 фунтов)  |
| 3       | SMALL                    | Малое (15 500–75 000 фунтов) |
| 4       | LARGE                    | Крупное (75 000–300 000 ф.)  |
| 5       | HIGH_VORTEX_LARGE        | Крупное с сильным вихрем (B-757) |
| 6       | HEAVY                    | Тяжёлое (> 300 000 фунтов)   |
| 7       | HIGH_PERFORMANCE         | Высокопроизводительное       |
| 8       | ROTORCRAFT               | Вертолёт                     |
| 9       | GLIDER                   | Планёр                       |
| 10      | LIGHTER_THAN_AIR         | Легче воздуха (дирижабль)    |
| 11      | PARACHUTIST              | Парашютист                   |
| 12      | ULTRALIGHT               | Сверхлёгкое ВС               |
| 14      | UAV                      | Беспилотник                  |
| 15      | SPACE                    | Космическое ВС               |

**Индексы:**
- `idx_sv_snapshot` — на `(snapshot_id)`
- `idx_sv_icao24` — на `(icao24)`
- `idx_sv_last_contact` — на `(last_contact)`
- `idx_sv_position` — на `(latitude, longitude)` WHERE не NULL
- `idx_sv_velocity` — на `(velocity DESC)` WHERE не NULL
- `idx_sv_altitude` — на `(baro_altitude DESC)` WHERE не NULL
- `idx_sv_category` — на `(category)`
- `idx_sv_callsign` — на `(callsign)` WHERE не NULL
- `idx_sv_no_callsign` — на `(snapshot_id)` WHERE callsign IS NULL
- `idx_sv_squawk` — на `(squawk)` WHERE не NULL
- `idx_sv_vrate` — на `(vertical_rate)` WHERE не NULL
- `idx_sv_on_ground` — на `(on_ground, latitude, longitude)` WHERE координаты не NULL

---

### 3.4 `flights` — Рейсы

Данные о завершённых рейсах, собранные из API OpenSky (эндпоинт `GET /flights/all`). Каждый рейс — отдельная строка.

| Столбец                                    | Тип           | Ограничения        | Описание                                    |
|--------------------------------------------|---------------|--------------------|---------------------------------------------|
| `id`                                       | `BIGSERIAL`   | PRIMARY KEY        | Автоинкрементный идентификатор              |
| `icao24`                                   | `VARCHAR(6)`  | NOT NULL           | ICAO-адрес транспондера                     |
| `callsign`                                 | `VARCHAR(8)`  |                    | Позывной                                    |
| `first_seen`                               | `BIGINT`      | NOT NULL           | Unix-timestamp взлёта                       |
| `last_seen`                                | `BIGINT`      | NOT NULL           | Unix-timestamp посадки                      |
| `est_departure_airport`                    | `VARCHAR(4)`  |                    | ICAO-код аэропорта вылета                   |
| `est_arrival_airport`                      | `VARCHAR(4)`  |                    | ICAO-код аэропорта прилёта                  |
| `est_departure_airport_horiz_distance`     | `INTEGER`     |                    | Горизонтальное расстояние до аэропорта вылета, м |
| `est_departure_airport_vert_distance`      | `INTEGER`     |                    | Вертикальное расстояние до аэропорта вылета, м |
| `est_arrival_airport_horiz_distance`       | `INTEGER`     |                    | Горизонтальное расстояние до аэропорта прилёта, м |
| `est_arrival_airport_vert_distance`        | `INTEGER`     |                    | Вертикальное расстояние до аэропорта прилёта, м |
| `departure_airport_candidates_count`       | `INTEGER`     |                    | Число кандидатов-аэропортов вылета          |
| `arrival_airport_candidates_count`         | `INTEGER`     |                    | Число кандидатов-аэропортов прилёта         |
| `collected_at`                             | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Время записи в БД                      |

**Уникальное ограничение:** `UNIQUE (icao24, first_seen, last_seen)` — предотвращает дублирование рейсов при повторной загрузке.

**Индексы:**
- `idx_fl_arrival_airport` — на `(est_arrival_airport, last_seen)` WHERE не NULL
- `idx_fl_departure_airport` — на `(est_departure_airport, first_seen)` WHERE не NULL
- `idx_fl_route` — на `(est_departure_airport, est_arrival_airport)` WHERE оба не NULL
- `idx_fl_icao24` — на `(icao24, first_seen)`
- `idx_fl_callsign` — на `(callsign)` WHERE не NULL
- `idx_fl_first_seen` — на `(first_seen)`

---

### 3.5 `flight_tracks` — Треки полётов

Заголовки треков (временны́е границы маршрута). Связаны с таблицей `waypoints`.

| Столбец        | Тип           | Ограничения        | Описание                              |
|----------------|---------------|--------------------|---------------------------------------|
| `id`           | `BIGSERIAL`   | PRIMARY KEY        | Автоинкрементный идентификатор        |
| `icao24`       | `VARCHAR(6)`  | NOT NULL           | ICAO-адрес транспондера               |
| `callsign`     | `VARCHAR(8)`  |                    | Позывной                              |
| `start_time`   | `BIGINT`      | NOT NULL           | Unix-timestamp начала трека           |
| `end_time`     | `BIGINT`      | NOT NULL           | Unix-timestamp конца трека            |
| `collected_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Время записи в БД                |

**Уникальное ограничение:** `UNIQUE (icao24, start_time)`.

**Индексы:**
- `idx_ft_icao24` — на `(icao24, start_time)`

---

### 3.6 `waypoints` — Точки маршрута

Отдельные точки геотрека воздушного судна. Каскадно удаляются при удалении родительского трека.

| Столбец           | Тип                | Ограничения                          | Описание                          |
|-------------------|--------------------|--------------------------------------|-----------------------------------|
| `id`              | `BIGSERIAL`        | PRIMARY KEY                          | Автоинкрементный идентификатор    |
| `flight_track_id` | `BIGINT`           | NOT NULL, FK → `flight_tracks(id)` CASCADE | Привязка к треку          |
| `time`            | `BIGINT`           | NOT NULL                             | Unix-timestamp точки              |
| `latitude`        | `DOUBLE PRECISION` |                                      | Широта, градусы                   |
| `longitude`       | `DOUBLE PRECISION` |                                      | Долгота, градусы                  |
| `baro_altitude`   | `DOUBLE PRECISION` |                                      | Барометрическая высота, метры     |
| `true_track`      | `DOUBLE PRECISION` |                                      | Истинный курс, градусы            |
| `on_ground`       | `BOOLEAN`          | NOT NULL, DEFAULT FALSE              | `true` — на земле                 |

**Индексы:**
- `idx_wp_track` — на `(flight_track_id)`
- `idx_wp_position` — на `(latitude, longitude)` WHERE не NULL

---

## 4. Связи между таблицами

| Таблица        | Внешний ключ       | Ссылается на       | Поведение при удалении |
|----------------|--------------------|--------------------|------------------------|
| `state_vectors`| `snapshot_id`      | `snapshots(id)`    | CASCADE                |
| `waypoints`    | `flight_track_id`  | `flight_tracks(id)`| CASCADE                |
| `flights`      | `est_departure_airport` | `airports(icao)` | (нет явного FK)      |
| `flights`      | `est_arrival_airport`   | `airports(icao)` | (нет явного FK)      |

> Таблицы `flights` и `airports` связаны логически через ICAO-коды, но без объявления внешнего ключа — это позволяет хранить рейсы даже при отсутствии аэропорта в справочнике.

---

## 5. Стратегия индексирования

Индексы разделены на функциональные группы:

**Реальное время (`state_vectors`):**
- Partial-индексы на `NULL`-столбцы (`velocity`, `altitude`, `callsign`) уменьшают размер индекса
- Составной индекс на `(on_ground, latitude, longitude)` ускоряет фильтрацию по положению

**Аэропортная аналитика (`flights`):**
- Индексы с `last_seen` / `first_seen` позволяют эффективно фильтровать по временным периодам
- Составной индекс маршрут `(est_departure_airport, est_arrival_airport)` ускоряет агрегации по парам аэропортов

**Геопространственные запросы:**
- Индексы на `(latitude, longitude)` ускоряют фильтрацию по координатному прямоугольнику (bbox)

---

## 6. Типичные запросы

### Последний снапшот
```sql
SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1;
```

### Позиции всех бортов в последнем снапшоте
```sql
SELECT sv.*
FROM state_vectors sv
JOIN (SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1) s
  ON sv.snapshot_id = s.id;
```

### Популярные маршруты за 7 дней
```sql
SELECT est_departure_airport, est_arrival_airport, COUNT(*) AS flight_count
FROM flights
WHERE first_seen >= EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days')
  AND est_departure_airport IS NOT NULL
  AND est_arrival_airport IS NOT NULL
GROUP BY est_departure_airport, est_arrival_airport
ORDER BY flight_count DESC
LIMIT 20;
```

### Топ аэропортов по загруженности за 24 часа
```sql
SELECT airport, SUM(cnt) AS total_flights
FROM (
  SELECT est_departure_airport AS airport, COUNT(*) AS cnt
  FROM flights
  WHERE first_seen >= EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours')
    AND est_departure_airport IS NOT NULL
  GROUP BY est_departure_airport
  UNION ALL
  SELECT est_arrival_airport, COUNT(*)
  FROM flights
  WHERE last_seen >= EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours')
    AND est_arrival_airport IS NOT NULL
  GROUP BY est_arrival_airport
) t
GROUP BY airport
ORDER BY total_flights DESC
LIMIT 20;
```
