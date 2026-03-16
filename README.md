# AeroGuys - Гайд по запуску

## 🐳 1. Настройка Docker

### Установка Docker (если еще не установлен)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

После добавления в группу docker нужно выйти и снова войти в систему.

### Запуск PostgreSQL в Docker

```bash
# Запустить базу данных (запускать из корня)
docker-compose up -d

# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs postgres

# Остановить
docker-compose down

# Остановить и удалить данные
docker-compose down -v
```

База данных будет доступна на `localhost:5433` (не стандартный порт 5432!)

## 🐍 2. Настройка Python окружения

### Создание виртуального окружения

ПРОЕКТ ДЕЛАТЬ ТОЛЬКО В ОКРУЖЕНИИ, ЧТОБЫ НЕ ГРУЗИТЬ ЛИШНИЕ ЛИБЫ ИЗ ОБЩЕГО ОКРУЖЕНИЯ

```bash
# Создать venv
python3 -m venv venv

# Активировать
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate.bat  # Windows
```

### Установка зависимостей

```bash
# Установить из requirements.txt
pip install -r requirements.txt
```

### Как создать/обновить requirements.txt

Если вы добавляете новые библиотеки в проект:

```bash
pip freeze > requirements.txt
```

## ⚙️ 3. Настройка переменных окружения (.env)

Создайте файл `.env` в корне проекта:

```bash
# Скопировать пример
cp .env.example .env
```

### Где получить OpenSky API ключи:

1. У меня
2. У себя

> ⚠️ **Важно:** Файл `.env` должен быть в `.gitignore` и не отправляться в репозиторий!

## 🚀 4. Тестовый запуск

### Запуск quick_poll.py для теста

Этот скрипт проверит подключение к БД, создаст схему (если нужно) и соберет последние данные о полетах:

```bash
# Убедитесь, что venv активирован и Docker запущен
source venv/bin/activate
docker-compose up -d

# Запустить скрипт сбора данных
python quick_poll.py
```