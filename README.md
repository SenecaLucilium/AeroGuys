# AeroGuys — Система мониторинга авиационного трафика

**AeroGuys** — аналитическая платформа реального времени: собирает данные рейсов из OpenSky Network, хранит в PostgreSQL и отображает через React/FastAPI.

```
OpenSky Network API → PostgreSQL 15 → FastAPI :8000 → React/Vite :3000
```

---

## 🗂️ Структура проекта

```
AeroGuys/
├── docker-compose.yml       # Поднимает все сервисы разом
├── requirements.txt         # Python-зависимости бэкенда
├── .env                     # Секреты (не в git! создать из .env.example)
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
    ├── package.json         # Зависимости Node.js (node_modules не в git)
    └── src/
        ├── api/             # HTTP-клиент + типы
        ├── hooks/           # React-хуки
        └── pages/           # Страницы приложения
```

---

## 🆕 Первый старт после клонирования

```bash
git clone <url-репозитория>
cd AeroGuys
```

> `node_modules/` и `venv/` **не хранятся в репозитории**.
> Каждый разработчик устанавливает зависимости локально (инструкции ниже).

---

## 🐳 Способ 1: Docker (рекомендуется)

Поднимает **PostgreSQL + Backend + Frontend** одной командой, без ручной настройки окружений.

### Требования
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- Файл `.env` с ключами OpenSky

### Установка Docker

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Перезайдите в сессию, чтобы группа docker применилась
```

**Arch/Manjaro:**
```bash
sudo pacman -S docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### Запуск

```bash
# 1. Создайте .env из шаблона и заполните ключи
cp .env.example .env
nano .env          # вставьте OPENSKY_CLIENT_ID и OPENSKY_CLIENT_SECRET

# 2. Поднимите все сервисы
docker-compose up -d --build

# 3. Проверьте статус
docker-compose ps
```

После старта доступно:

| Сервис       | Адрес                          |
|---|---|
| Фронтенд     | http://localhost:3000          |
| Backend API  | http://localhost:8000          |
| Swagger UI   | http://localhost:8000/api/docs |
| PostgreSQL   | localhost:5433                 |

### Управление

```bash
docker-compose logs -f           # логи всех сервисов
docker-compose logs -f backend   # логи только бэкенда
docker-compose down              # остановить (данные сохраняются)
docker-compose down -v           # остановить + стереть данные БД
docker-compose up -d --build     # пересобрать после изменений кода
```

---

## 🛠️ Способ 2: Локальный запуск (для разработки)

### Требования
- Python 3.11+
- Node.js 20+ и npm 10+
- Docker (только для PostgreSQL)

---

### Шаг 1 — PostgreSQL через Docker

```bash
docker-compose up -d postgres
docker-compose ps postgres    # убедитесь, что Status = healthy
```

---

### Шаг 2 — Python-окружение

> Всегда работайте внутри `venv` — это изолирует зависимости проекта от системного Python.

```bash
# Создать venv (один раз)
python3 -m venv venv

# Активировать
source venv/bin/activate          # Linux / macOS
# venv\Scripts\activate.bat       # Windows (cmd)
# venv\Scripts\Activate.ps1       # Windows (PowerShell)

# Установить зависимости
pip install -r requirements.txt
```

---

### Шаг 3 — Переменные окружения

```bash
cp .env.example .env
# Откройте .env и заполните:
#   OPENSKY_CLIENT_ID=...
#   OPENSKY_CLIENT_SECRET=...
```

---

### Шаг 4 — Запуск Backend API

```bash
source venv/bin/activate
cd backend/src
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

API: http://localhost:8000 · Swagger: http://localhost:8000/api/docs

---

### Шаг 5 — Установка зависимостей и запуск фронтенда

```bash
cd frontend

# node_modules не хранятся в git — установить один раз
npm install

# Запустить dev-сервер
npm run dev
```

Фронтенд: http://localhost:3000  
Все запросы `/api/*` автоматически проксируются на `:8000`.

---

## 📡 Сбор данных из OpenSky

```bash
source venv/bin/activate

# Разовый сбор данных (весь мир)
python quick_poll.py

# Проверить аналитику по собранным данным
python test_queries.py
```

> Чем больше запусков `quick_poll.py` — тем богаче аналитика.

**Автоматический сбор через cron:**
```bash
crontab -e
# Добавить строку — запуск каждые 10 минут:
# */10 * * * * cd /путь/к/AeroGuys && venv/bin/python quick_poll.py >> poll.log 2>&1
```

---

## ➕ Добавление зависимостей

**Python:**
```bash
source venv/bin/activate
pip install <пакет>
# Вручную добавьте в requirements.txt с минимальной версией:
#   <пакет>>=X.Y.Z
```

> Не делайте `pip freeze > requirements.txt` — это сохраняет весь граф транзитивных зависимостей
> с точными версиями, что ломается при смене платформы или Python-версии.

**Node.js (frontend):**
```bash
cd frontend
npm install <пакет>
# package.json обновится автоматически
# Коммитьте package.json и package-lock.json — НЕ node_modules/
```

---

## 🔀 Git-воркфлоу

```bash
# Клонировать репозиторий и сразу установить зависимости
git clone <url>
cd AeroGuys

# --- Python ---
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# --- Frontend ---
cd frontend && npm install && cd ..

# Создать ветку для фичи
git checkout -b feature/my-feature

# Зафиксировать изменения
git add .
git commit -m "feat: описание изменений"

# Отправить ветку и создать Pull Request
git push origin feature/my-feature
```

**Что НЕ попадает в git** (задано в `.gitignore`):

| Что | Почему |
|---|---|
| `venv/` | Локальное Python-окружение |
| `__pycache__/`, `*.pyc` | Байткод Python |
| `frontend/node_modules/` | Установленные npm-пакеты |
| `frontend/dist/` | Скомпилированный фронтенд |
| `.env` | Секреты и API-ключи |
| `*.log` | Логи выполнения |

---

## ⚠️ Частые проблемы

| Симптом | Причина | Решение |
|---|---|---|
| Пустые таблицы на фронте | БД пуста | `python quick_poll.py` + обновить страницу |
| Ошибка подключения к БД | Docker не запущен | `docker-compose up -d postgres` |
| `OPENSKY_CLIENT_ID not found` | Нет `.env` | `cp .env.example .env` и заполнить |
| Фронт не видит API | Бэкенд не запущен | `uvicorn` или `docker-compose up` |
| `npm: command not found` | Node.js не установлен | Установить с [nodejs.org](https://nodejs.org/) |
| `ModuleNotFoundError` | venv не активирован | `source venv/bin/activate` |
