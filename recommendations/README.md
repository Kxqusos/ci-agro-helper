# Recommendations Service

Сервис расчёта рекомендаций по севообороту. Компонент хранит формализованные правила из `.memory-base` и предоставляет публичный API (контракт — `recommendations/openapi.yaml`). Ниже описаны артефакты и процедура первичного наполнения базы данных.

## Данные и структура

- `data/crop_rotation_rules.json` — каноничный источник агрономических правил (культуры, семейства, источники, предшественники, требования к почве).
- `data/crops_seed.json`, `data/crop_rotation_rules_seed.json`, `data/soil_requirements_seed.json` — денормализованные представления под таблицы `crops`, `crop_rotation_rules`, `soil_requirements`, экспортированные из основного файла для удобства ревью и ручного импорта.
- `database/seed_rules.py` — утилита сидирования, читающая `crop_rotation_rules.json` и заполняющая таблицы `sources`, `botanical_families`, `crops`, `crop_rotation_rules`, `soil_requirements`, `nutrient_impact`, `crop_predecessors`.
- `schemas.py` — Pydantic-схемы запросов/ответов (`RecommendationQueryPayload`, `RulesCatalogResponse` и др.).
- `routers/recommendations.py` — каркас публичных маршрутов (`POST /recommendations/query`, `GET /recommendations/rules`) + загрузка справочника правил.
- `openapi.yaml` — зафиксированный API-контракт, используемый при интеграции с API Gateway и фронтендом.

## API и каркас сервиса

- `POST /recommendations/query` — принимает историю поля, целевой сезон, опциональные ограничения и возвращает ранжированный список культур с пояснениями правил и совпадением по почве. Требует заголовка `Authorization: Bearer <token>`: токен валидируется через HTTP-запрос к `auth_service` (`GET /me`), после чего контекст пользователя прикладывается ко всем downstream-вызовам (field selector, аудит).
- `GET /recommendations/rules` — отдаёт текущий каталог правил (версии, источники, культуры, требования к почве). Доступен без авторизации для дебага и UI.
- `GET /healthz` — технический эндпоинт для readiness/liveness.

FastAPI-приложение регистрирует:

1. Middleware логирования (`log_requests`) — проставляет `request_id` (берётся из `X-Request-ID` или генерируется автоматически), пишет метод, путь, статус и время ответа в `recommendations.audit`.
2. Middleware авторизации (`enforce_authorization`) — защищает `/recommendations/*`, кроме `rules`, и кэширует результат `auth_service` в `request.state`.
3. Централизованный обработчик ошибок (`middleware/error_handler.py`) — нормализует ответы в формате `ErrorResponse`, дублирует `request_id` в теле/заголовке и логирует все ошибки вместе с корреляционным идентификатором.

### Ошибки и аудит

- Любой ответ ≥400 возвращает JSON вида:

  ```json
  {
    "request_id": "f41d8c0a-...",
    "error": {"code": "auth.invalid_token", "detail": "Недействительный или истёкший токен."},
    "errors": []  // только для 422
  }
  ```

- Клиент всегда получает заголовок `X-Request-ID` (совпадает с `request_id` в теле).
- Аудит-логи (`recommendations.audit`) фиксируют user_id (если авторизован), путь, статус и длительность запроса. Эти записи используют JSON-подобный формат `audit request_id=... user_id=...`.

### Пример запроса

```bash
curl -X POST http://localhost:8001/recommendations/query \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{
    "field_id": "fld-demo-001",
    "target_season": "spring",
    "target_year": 2026,
    "history": [
      {"year": 2024, "season": "autumn", "crop_id": 1, "crop_name": "Пшеница"},
      {"year": 2025, "season": "summer", "crop_id": 19, "crop_name": "Горох"}
    ],
    "soil_profile": {"ph": 6.4, "soil_type": ["суглинистая"], "organic_matter": "средняя", "drainage": "хороший"},
    "preferred_crops": [19, 42],
    "constraints": {"avoid_botanical_families": ["poaceae"], "require_organic_matter": "высокая"},
    "limit": 3
  }'
```

Ответ включает `recommendations` (score, priority, soil_match, warnings) и метаданные `request_id`, `data_version` для трассировки.

## Наблюдаемость (Observability)

Сервис рекомендаций поддерживает полный observability-стек: метрики Prometheus, структурированные JSON-логи и OpenTelemetry трассировку.

### Prometheus метрики

По умолчанию метрики доступны на `GET /metrics`. Путь можно изменить через переменную `PROMETHEUS_METRICS_PATH`.

**Включение метрик:**

```bash
# В .env или docker-compose.yml
ENABLE_PROMETHEUS_METRICS=true
PROMETHEUS_METRICS_PATH=/metrics
```

**Ключевые метрики:**

- **Базовые HTTP-метрики FastAPI** (latency, requests in progress, response sizes)
- **`recommendations_evaluated_total{outcome}`** — счётчик выполненных расчётов рекомендаций (labels: `outcome="success"` / `outcome="error"`)
- **`recommendations_evaluation_duration_seconds`** — гистограмма времени выполнения движка правил (buckets: 0.05s, 0.1s, 0.25s, 0.5s, 1s, 2.5s, 5s, 10s, 30s)

**Примеры запросов:**

```bash
# Локально
curl http://localhost:8001/metrics | head -n 20

# В Docker
curl http://localhost:8002/metrics | grep recommendations_evaluated_total

# Проверка конкретной метрики
curl -s http://localhost:8002/metrics | grep 'recommendations_evaluation_duration_seconds_bucket'
```

**Пример вывода:**

```prometheus
# HELP recommendations_evaluated_total Количество выполненных расчётов рекомендаций по исходу
# TYPE recommendations_evaluated_total counter
recommendations_evaluated_total{outcome="success"} 42.0
recommendations_evaluated_total{outcome="error"} 3.0

# HELP recommendations_evaluation_duration_seconds Время выполнения движка рекомендаций в секундах
# TYPE recommendations_evaluation_duration_seconds histogram
recommendations_evaluation_duration_seconds_bucket{le="0.05"} 15.0
recommendations_evaluation_duration_seconds_bucket{le="0.1"} 38.0
recommendations_evaluation_duration_seconds_bucket{le="0.25"} 42.0
recommendations_evaluation_duration_seconds_sum 18.456
recommendations_evaluation_duration_seconds_count 42.0
```

### JSON-логи и request_id

Каждый HTTP-запрос логируется в JSON-формате с полями для интеграции с Loki/ELK.

**Каналы логирования:**

- `recommendations.api` — операционные логи (запуск сервиса, инициализация компонентов)
- `recommendations.audit` — аудит-логи каждого HTTP-запроса

**Поля в логах:**

```json
{
  "event": "request.completed",
  "request_id": "f41d8c0a-1234-5678-90ab-cdef12345678",
  "method": "POST",
  "path": "/recommendations/query",
  "status": 200,
  "user_id": "user-123",
  "duration_ms": 145.67
}
```

**Проверка логов:**

```bash
# Docker Compose
docker compose logs -f recommendations | grep request.completed

# Извлечь все request_id
docker compose logs recommendations | jq -r 'select(.request_id) | .request_id' | sort | uniq

# Найти все запросы конкретного пользователя
docker compose logs recommendations | jq -r 'select(.user_id == "user-123")'
```

**Сопоставление request_id:**

1. Клиент отправляет запрос и получает заголовок `X-Request-ID` в ответе
2. При ошибках (≥400) поле `request_id` дублируется в теле ответа:
   ```json
   {
     "request_id": "f41d8c0a-...",
     "error": {"code": "recommendations.not_found", "detail": "..."}
   }
   ```
3. Используйте `request_id` для поиска в логах:
   ```bash
   docker compose logs recommendations | grep "f41d8c0a-1234-5678-90ab-cdef12345678"
   ```

Это соответствует сценарию из `.memory-base/user-docs/info.md`: пользователь видит `request_id` в UI, поддержка может найти полный контекст запроса в логах.

### OpenTelemetry трассировка

Для production-окружений можно включить OTLP-экспорт спанов в observability-стек (Jaeger, Tempo, Grafana Cloud и т.д.).

**Минимальная конфигурация:**

```bash
# .env
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_SERVICE_NAME=recommendations-service
```

**Дополнительные переменные:**

```bash
# Для SaaS-коллекторов с аутентификацией
OTEL_EXPORTER_OTLP_HEADERS=x-otlp-token=your-secret-token

# Для локальной разработки без TLS
OTEL_EXPORTER_OTLP_INSECURE=true
```

**Автоматическая трассировка:**

При наличии `OTEL_EXPORTER_OTLP_ENDPOINT` сервис автоматически создаёт спаны для:
- Входящих HTTP-запросов FastAPI (метод, путь, статус, длительность)
- Вызовов rule engine (параметры, результат)
- Downstream-запросов к auth_service и field_selector

**Проверка работы OTLP:**

```bash
# Запустите локальный OpenTelemetry Collector
docker run -d --name otel-collector \
  -p 4317:4317 -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml \
  otel/opentelemetry-collector-contrib:latest

# Настройте сервис
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_EXPORTER_OTLP_INSECURE=true
uvicorn main:app --reload --port 8001

# Сделайте тестовый запрос
curl -X POST http://localhost:8001/recommendations/query \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{"field_id":"test","target_season":"spring","target_year":2026,"history":[]}'

# Проверьте логи collector'а на наличие экспортированных спанов
docker logs otel-collector | grep "Span"
```

**Пример конфигурации OpenTelemetry Collector:**

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  debug:
    verbosity: detailed
  # Или отправка в Jaeger/Tempo
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug, otlp/jaeger]
```

**Отключение трассировки:**

Если `OTEL_EXPORTER_OTLP_ENDPOINT` пуст или не задан, сервис работает без создания трейсов. Ошибок при этом не возникает.

### Интеграция с Grafana/Prometheus

После накопления метрик можно настроить дашборды:

**Полезные PromQL запросы:**

```promql
# Rate успешных рекомендаций за 5 минут
rate(recommendations_evaluated_total{outcome="success"}[5m])

# P95 latency движка правил
histogram_quantile(0.95, rate(recommendations_evaluation_duration_seconds_bucket[5m]))

# Процент ошибок
rate(recommendations_evaluated_total{outcome="error"}[5m])
  /
rate(recommendations_evaluated_total[5m])
```

Примеры дашбордов доступны в `.memory-base/observability/` (планируется в будущих тикетах).

## Переменные окружения

Сервис читает строку подключения PostgreSQL из `RECOMMENDATIONS_DATABASE_URL` (или `DATABASE_URL` в качестве запасного варианта). Также добавлены переменные для интеграции с auth_service и field selector. Файл `.env.example` содержит минимальные значения:

```
POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=app
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${POSTGRES_DB}
RECOMMENDATIONS_DATABASE_URL=${DATABASE_URL}
AUTH_SERVICE_BASE_URL=http://auth:8000
AUTH_SERVICE_TIMEOUT=2.5
FIELD_SELECTOR_BASE_URL=http://field-selector:8005
FIELD_SELECTOR_TIMEOUT=3.0
```

Перед запуском скопируйте `.env.example` в `.env` и при необходимости измените хост/пароль.

## Сидирование правил в базу данных

Сидирование заполняет 7 таблиц (`sources`, `botanical_families`, `crops`, `crop_rotation_rules`, `soil_requirements`, `nutrient_impact`, `crop_predecessors`) данными из `data/crop_rotation_rules.json`. Скрипт выполняет валидацию ссылок, enum-значений и диапазонов перед записью.

### Запуск локально

1. Подготовьте окружение:
   ```bash
   cd recommendations
   python3 -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Проверьте данные без записи в БД (dry-run):
   ```bash
   python -m database.seed_rules --dry-run -v
   ```

3. Наполните базу:
   ```bash
   export RECOMMENDATIONS_DATABASE_URL="postgresql+asyncpg://app:app@localhost:5432/app"
   python -m database.seed_rules -v
   ```

   Скрипт использует переменную `RECOMMENDATIONS_DATABASE_URL` (или `DATABASE_URL` как запасную). При успешном выполнении вы увидите:
   ```
   INFO seed_rules: Validated 6 crops from .../crop_rotation_rules.json
   INFO seed_rules: Seed complete: sources=4, families=8, crops=6, rotation_rules=6, soil_requirements=6, nutrient_impact=6, predecessors=42
   ```

### Запуск в контейнере

Через `docker compose run` (требует запущенного PostGIS):

```bash
# Убедитесь, что база данных запущена
docker compose up -d postgres

# Запустите сидирование
docker compose run --rm recommendations python -m database.seed_rules -v

# Или в одной команде с пересборкой
docker compose up -d postgres && \
docker compose run --rm recommendations python -m database.seed_rules -v
```

Альтернативно, можно запустить контейнер с `bash` и выполнить команду вручную:

```bash
docker compose run --rm recommendations bash
# Внутри контейнера:
python -m database.seed_rules -v
exit
```

### Параметры сидера

- `--crop-id <id>` — частичное обновление для конкретной культуры (можно указать несколько раз).
- `--data-file <path>` — путь к альтернативному JSON-файлу с правилами (по умолчанию `data/crop_rotation_rules.json`).
- `--dry-run` — только валидация структуры данных без подключения к БД.
- `--echo-sql` — вывод SQL запросов SQLAlchemy для отладки.
- `-v / -vv` — уровень логирования (INFO / DEBUG).

Примеры:

```bash
# Обновить только правила для пшеницы (crop_id=1) и гороха (crop_id=19)
python -m database.seed_rules --crop-id 1 --crop-id 19 -v

# Использовать альтернативный файл данных
python -m database.seed_rules --data-file=/path/to/custom_rules.json -v

# Показать SQL для отладки
python -m database.seed_rules --echo-sql -vv
```

### Проверки целостности

Перед записью скрипт гарантирует:

- уникальность `crop_id` и `source_id`;
- наличие семейства для каждой культуры, включая ссылки в `incompatible_families` и `family:*`-предшественниках;
- корректность интервалов севооборота и диапазонов pH;
- валидность ссылок на источники для всех предшественников;
- корректные enum-значения (`data_confidence`, `organic_matter`, `drainage`, `nutrient_impact` и т.д.).

При повторном запуске используются UPSERT (`ON CONFLICT DO UPDATE`), поэтому сидер можно выполнять сколько угодно раз без появления дубликатов.

### Проверка результата

После успешного сидирования проверьте, что правила загружены:

```bash
# Локально
curl http://localhost:8001/recommendations/rules | jq '.crops | length'
# Должно вернуть: 6

# В Docker
curl http://localhost:8002/recommendations/rules | jq '.version'
# Должно вернуть: "1.0.0"
```
