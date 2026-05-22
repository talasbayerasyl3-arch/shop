# Elmira Books Shop

Готовый адаптивный сайт для продажи учебных книг по английскому языку.

## Что внутри

- каталог книг с поиском и фильтром по уровням
- карточки книг с ценой, описанием и кнопкой связи
- отдельная страница книги
- темная тема
- адаптация под телефон
- админ-панель для добавления, редактирования и удаления книг
- изменение контактов продавца
- загрузка изображений книг
- поддержка Firebase Firestore + Firebase Storage
- демо-режим на `localStorage`, если Firebase еще не настроен

## Файлы

- `index.html` - точка входа
- `styles.css` - стили
- `app.js` - логика интерфейса
- `firebase-config.js` - ваш Firebase конфиг
- `firebase-config.example.js` - пример заполнения

## Быстрый запуск

1. Откройте папку проекта.
2. Запустите локальный сервер:

```bash
python -m http.server 8000
```

3. Откройте в браузере:

```text
http://localhost:8000
```

## Постоянный публичный доступ через GitHub Pages

В проект уже добавлен workflow для автоматического деплоя на GitHub Pages:

1. Создайте репозиторий на GitHub.
2. Загрузите туда содержимое этой папки.
3. В GitHub откройте `Settings -> Pages`.
4. В `Build and deployment` выберите `GitHub Actions`.
5. Запушьте изменения в ветку `main`.

После этого сайт будет опубликован по адресу вида:

```text
https://<ваш-логин>.github.io/<имя-репозитория>/
```

Если нужен свой домен, добавьте его позже через настройки GitHub Pages.

## Подключение Firebase

1. Создайте проект в Firebase.
2. Включите:
   - Firestore Database
   - Storage
3. Скопируйте `firebase-config.example.js` в `firebase-config.js`.
4. Подставьте свои ключи Firebase Web App.
5. Создайте правила доступа под ваш сценарий. Для публичного продакшена добавьте Firebase Auth и закройте админ-доступ правилами.

## Структура данных Firestore

Коллекция `books`:

```json
{
  "title": "Starter English Vocabulary",
  "shortDescription": "Короткое описание",
  "fullDescription": "Полное описание",
  "level": "Beginner",
  "price": 5900,
  "tags": ["Vocabulary", "Starter"],
  "image": "https://...",
  "accent": "#2563eb"
}
```

Документ `settings/seller`:

```json
{
  "phone": "+7 777 123 45 67",
  "whatsapp": "77771234567",
  "telegram": "englishbookseller"
}
```

## Важно

По документации Firebase для web часть SDK требует запуск сайта с сервера, а не напрямую через `file://`, поэтому используйте локальный HTTP-сервер даже для разработки.
