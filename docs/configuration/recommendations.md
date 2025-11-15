# Конфигурация сервиса рекомендаций

Документ описывает переменные окружения, секреты и сценарии запуска сервиса `recommendations`. Базовые значения перечислены в `recommendations/.env.example`; для контейнеров из `docker-compose.yml` достаточно скопировать файл в `.env` в корне репозитория.

## Переменные окружения

| Переменная | Назначение | Значение по умолчанию |
| --- | --- | --- |
| `RECOMMENDATIONS_DATABASE_URL` | Асинхронная строка подключения к Postgres/PostGIS. Повторяет `DATABASE_URL` и используется Alembic и приложением. | `postgresql+asyncpg://app:app@postgres:5432/app` |
| `AUTH_SERVICE_BASE_URL` | HTTP-база `auth_service` для проверки токенов (`GET /me`). | `http://auth:8000` |
| `AUTH_SERVICE_TIMEOUT` | Таймаут запроса к auth-сервису (секунды). | `2.5` |
| `FIELD_SELECTOR_BASE_URL` | Опциональный URL сервиса полей, откуда подтягивается история/профиль. | `http://field-selector:8085` |
| `FIELD_SELECTOR_TIMEOUT` | Таймаут взаимодействия с field selector. | `3.0` |
| `KAFKA_ENABLED` | Переключатель фонового воркера Kafka; при `false` сервис работает только по HTTP. | `false` |
| `KAFKA_BOOTSTRAP_SERVERS` | Кластер Kafka, который содержит топики `recommendations.request/result`. | `kafka:9092` |
| `KAFKA_*` | Настройки клиента (`CLIENT_ID`, `GROUP_ID`, `POLL_TIMEOUT_MS`, `RETRY_BACKOFF_SECONDS`, `MAX_RETRY_ATTEMPTS`). | См. `.env.example` |
| `ENABLE_PROMETHEUS_METRICS` | Включить публикацию `/metrics` (Prometheus). | `true` |
| `PROMETHEUS_METRICS_PATH` | URL-путь метрик. Полезно при разворачивании за API Gateway. | `/metrics` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | URL OTLP коллектор (например, `http://otel-collector:4318/v1/traces`). Если не задан, трассировка отключена. | — |
| `OTEL_EXPORTER_OTLP_HEADERS` | Дополнительные заголовки (`x-otlp-token=...`). | — |
| `OTEL_EXPORTER_OTLP_INSECURE` | Использовать HTTP без TLS при отправке трассировок. | `false` |
| `OTEL_SERVICE_NAME` | Имя сервиса в трейсах и ресурсах. | `recommendations-service` |

Чувствительные значения (пароли БД, токены OTLP) задавайте через `.env`/`docker secrets` и никогда не коммитьте в git.

## Режимы запуска

### Docker Compose (микростек)

```bash
cp .env.example .env
docker compose up -d postgres kafka
docker compose up --build recommendations
```

`docker compose logs -f recommendations` покажет структурированные JSON-логи (`event=request.completed`). Для локальной отладки Kafka можно отключить (`KAFKA_ENABLED=false`) — сервис продолжит обслуживать HTTP-запросы.

### Виртуальное окружение

```bash
cd recommendations
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8001
```

## Наблюдаемость

- **Метрики**: `GET /metrics` (по умолчанию). Экспортируются базовые HTTP-метрики FastAPI и доменные метки `recommendations_evaluated_total` и `recommendations_evaluation_duration_seconds`. Путь можно поменять через `PROMETHEUS_METRICS_PATH`.
- **Трассировка**: при заданном `OTEL_EXPORTER_OTLP_ENDPOINT` сервис настраивает `TracerProvider` и публикует спаны FastAPI (маршруты, вызовы rule engine). Добавьте `OTEL_EXPORTER_OTLP_HEADERS=x-otlp-token=...` при работе с SaaS.
- **Логи**: middleware пишет JSON-строки в каналы `recommendations.api` и `recommendations.audit`. Каждый лог содержит `request_id`, `path`, `duration_ms`, `user_id` и статус. Логи готовы к сбору Loki/ELK без дополнительной трансформации.

## Проверка health/observability

```bash
curl -H "Authorization: Bearer demo" \
  http://localhost:8002/recommendations/rules

curl http://localhost:8002/metrics | head -n 20

curl http://localhost:8002/healthz
```

При включённом OTLP поднимите совместимый collector (например, `otel/opentelemetry-collector`) и пробросьте его URL в `OTEL_EXPORTER_OTLP_ENDPOINT`.
