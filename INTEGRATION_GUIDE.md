# Добавление интеграции EasyAI Market

## Данные для интеграции

**Endpoint:** `https://api.stahptdp.com/api/affiliate/leads`  
**Method:** POST  
**Authorization:** Bearer Token (получите новый токен в EasyAI Market)

## Шаг 1: Создание интеграции

1. Откройте http://localhost:3000/brokers
2. Нажмите **"Create Integration"**
3. Введите название: **"EasyAI Market"**
4. Выберите **"Manual Integration"** (Ручная интеграция)

## Шаг 2: Настройка Push API (отправка лидов)

### URL:
```
https://api.stahptdp.com/api/affiliate/leads
```

### Method:
```
POST (JSON)
```

### Headers:
```json
{
  "Authorization": "Bearer YOUR_ACTUAL_TOKEN_HERE",
  "Content-Type": "application/json"
}
```

### Body:
```json
{
  "firstName": "${firstName}",
  "lastName": "${lastName}",
  "email": "${email}",
  "phone": "${phone}",
  "country": "${country}",
  "password": "${password}",
  "ip": "${ip}",
  "funnel": "${funnel}",
  "aff": "${aff}"
}
```

## Шаг 3: Настройка Pull API (получение статусов)

### Enable Pull API: ✅

### Pull URL:
```
https://api.stahptdp.com/api/affiliate/leads
```

### Pull Method:
```
GET
```

### Pull Headers:
```json
{
  "Authorization": "Bearer YOUR_ACTUAL_TOKEN_HERE"
}
```

### Pull Interval:
```
15 минут
```

## Шаг 4: Сохранение

Нажмите **"Save Integration"** - интеграция сохранится в базу данных.

## ⚠️ Важно

- Используйте **актуальный токен** (старый истек)
- Проверьте формат body согласно документации API
- После сохранения интеграция появится в списке доступных брокеров
- Токены хранятся **только в БД**, не в git!

## 🧪 Тестирование

После создания интеграции:
1. Создайте тестовый лид
2. Отправьте на EasyAI Market
3. Проверьте что лид отправился
4. Через 15 минут Pull API получит статус лида

## 📚 Документация API

https://documenter.getpostman.com/view/20282370/2sAYdkHp3t

