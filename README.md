# AeroGuys - Гайд по запуску

## �️ Структура проекта

```
AeroGuys/
├── docker-compose.yml       # Поднимает все сервисы разом
├── requirements.txt         # Python-зависимости бэкенда
├── .env                     # Секреты (не в git!)
├── .env.example             # Шаблон для .env
├── quick_poll.py            # Разовый сбор данных из OpenSky
├── test_queries.py          # Проверка аналитических запросов
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── api/             # FastAPI REST API
│       ├── Analysis/        # Аналитические запросы к БД
│       ├── DB/              # Менеджер БД и схема
│       ├── OpenskyAPI/      # Клиент OpenSky Network
│       └── parsing/         # Сбор и сохранение данных
└── frontend/
    ├── Dockerfile
    └── src/
        ├── api/             # HTTP-клиент + типы
        ├── hooks/           # React-хуки для каждого раздела
        └── pages/           # Страницы приложения
```

---

## 🐳 Способ 1: Запуск через Docker (рекомендуется)

Поднимает **PostgreSQL + Backend API + Frontend** одной командой.

### Требования
- Docker + Docker Compose
- Файл `.env` с ключами OpenSky (см. шаг ниже)

### Установка Docker (если ещё не установлен)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# После этого нужно выйти и снова войти в систему
```

### Запуск

**1. Создайте `.env` из шаблона:**
```bash
cp .env.example .env
# Откройте .env и вставьте свои OPENSKY_CLIENT_ID и OPENSKY_CLIENT_SECRET
```

**2. Запустите все сервисы:**
```bash
docker-compose up -d --build
```

**3. Проверьте, что всё запустилось:**
```bash
docker-compose ps
```

После старта доступно:

| Сервис | Адрес |
|---|---|
| Фронтенд | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |
| PostgreSQL | localhost:5433 |

### Управление

```bash
# Посмотреть логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend

# Остановить (данные сохраняются)
docker-compose down

# Остановить и удалить данные БД
docker-compose down -v

# Пересобрать после изменений в коде
docker-compose up -d --build
```

---

## 🛠️ Способ 2: Локальный запуск (для разработки)

### Требования
- Python 3.11+
- Node.js 20+
- Docker (только для PostgreSQL)

### Шаг 1 — База данных

```bash
# Запустить только PostgreSQL
docker-compose up -d postgres

# Проверить статус
docker-compose ps postgres
```

### Шаг 2 — Python-окружение

ПРОЕКТ ДЕЛАТЬ ТОЛЬКО В ОКРУЖЕНИИ, ЧТОБЫ НЕ ГРУЗИТЬ ЛИШНИЕ ЛИБЫ ИЗ ОБЩЕГО ОКРУЖЕНИЯ

```bash
# Создать venv (один раз)
python3 -m venv venv

# Активировать
source venv/bin/activate       # Linux/Mac
# venv\Scripts\activate.bat   # Windows

# Установить зависимости
pip install -r requirements.txt
```

### Шаг 3 — Переменные окружения

```bash
cp .env.example .env
# Заполните OPENSKY_CLIENT_ID и OPENSKY_CLIENT_SECRET
```

### Шаг 4 — Запуск Backend API

```bash
source venv/bin/activate
cd backend/src
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступен на http://localhost:8000  
Swagger UI — http://localhost:8000/api/docs

### Шаг 5 — Запуск Frontend

В отдельном терминале:

```bash
cd frontend
npm install       # только при первом запуске
npm run dev
```

Фронтенд будет доступен на http://localhost:3000  
Все запросы `/api/*` автоматически проксируются на `http://localhost:8000`.

---

## 📡 Сбор данных из OpenSky

Приложение накапливает данные через скрипт `quick_poll.py`.  
Чем больше запусков — тем богаче аналитика.

```bash
# Разовый сбор данных (весь мир: состояния + рейсы)
source venv/bin/activate
python quick_poll.py

# Проверить аналитические запросы по накопленным данным
python test_queries.py
```

> ⚠️ Рекомендуется запускать `quick_poll.py` регулярно через `cron` или вручную несколько раз, чтобы накопить данные для анализа.

### Настройка cron (опционально)

```bash
crontab -e
# Добавить строку — запуск каждые 10 минут:
# */10 * * * * cd /путь/к/AeroGuys && venv/bin/python quick_poll.py >> poll.log 2>&1
```

---

## ⚙️ Как добавить новые зависимости Python

```bash
source venv/bin/activate
pip install <package>
pip freeze > requirements.txt
```

---

## ⚠️ Важные замечания

| Ситуация | Причина | Решение |
|---|---|---|
| Нет данных в аналитике | БД пуста | Запустить `quick_poll.py` несколько раз |
| Ошибка подключения к БД | Docker не запущен | `docker-compose up -d postgres` |
| `OPENSKY_CLIENT_ID not found` | Нет `.env` файла | `cp .env.example .env` и заполнить |
| Фронт не видит API | Бэкенд не запущен | Запустить `uvicorn` или `docker-compose up` |

> ⚠️ Файл `.env` не должен попадать в git — он уже в `.gitignore`.
