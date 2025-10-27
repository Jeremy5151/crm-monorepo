# Broker Templates

Эта папка содержит шаблоны интеграций с брокерами. Шаблоны хранятся в git **БЕЗ** приватных данных (токенов, паролей).

## Структура шаблона

```json
{
  "code": "BROKER_CODE",
  "name": "Broker Name",
  "icon": "🔗",
  "push": {
    "method": "POST",
    "url": "https://api.broker.com/leads",
    "headers": {
      "Authorization": "Bearer {TOKEN}"
    },
    "bodyTemplate": {
      "email": "${email}",
      ...
    }
  },
  "pull": {
    "enabled": true,
    "url": "https://api.broker.com/leads/status",
    "method": "GET",
    "interval": 15
  },
  "params": {
    "TOKEN": {
      "type": "string",
      "required": true,
      "description": "API Token"
    }
  }
}
```

## Как добавить интеграцию

1. **Создайте шаблон** - добавьте JSON файл в эту папку
2. **В интерфейсе CRM** перейдите на страницу Integrations
3. **Создайте интеграцию** на основе шаблона
4. **Заполните параметры** - токены, credentials и т.д.
5. **Сохраните** - данные сохранятся в БД

## Безопасность

⚠️ **НИКОГДА** не коммитьте в git:
- Bearer токены
- API ключи
- Пароли
- Любые credentials

Все приватные данные должны быть в БД, не в git!



