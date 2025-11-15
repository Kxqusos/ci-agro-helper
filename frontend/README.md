# AgroPlanner Frontend (Next.js + BFF)

Веб-клиент CI Agro Helper реализован на Next.js App Router и использует архитектуру Backend for Frontend (BFF). Все сетевые запросы из UI идут на API-роуты (`/api/**`), которые проксируют вызовы во внутренние микросервисы и скрывают чувствительные переменные окружения.

## Быстрый старт

```bash
cd frontend
corepack enable
yarn install
cp .env.example .env.local
yarn dev
```

Приложение доступно на `http://localhost:3000`. По умолчанию `.env.example` включает `NEXT_PUBLIC_API_MOCKING=enabled`, поэтому при запуске dev-сервера автоматически стартует Mock Service Worker и подменяет ключевые запросы BFF. Это позволяет проработать сценарии планировщика без поднятых backend-сервисов. Для проверки связок с реальными сервисами удалите переменную или установите другое значение.

## Полезные команды

| Команда | Описание |
| --- | --- |
| `yarn dev` | Запуск Next.js dev-сервера с MSW, React 19 и живой перезагрузкой |
| `yarn build` / `yarn start` | Продакшн-сборка и запуск статики |
| `yarn lint` | ESlint + `eslint-config-next` |
| `yarn test` | Vitest (jsdom, Testing Library, coverage v8) |
| `yarn test:watch` | Vitest в интерактивном режиме |

## BFF маршруты

| Эндпоинт | Назначение | Внутреннее взаимодействие |
| --- | --- | --- |
| `/api/auth/**` | Логин, регистрация, refresh и `GET /me`. Включает proxy-хедеры `Authorization` и `X-Request-ID`. | `AUTH_SERVICE_URL` (FastAPI auth service) |
| `/api/recommendations/query` | Сбор `RecommendationQueryRequest`, проброс в сервис рекомендаций, обработка ошибок `NoRecommendationsError`. | `RECOMMENDATIONS_SERVICE_URL` |
| `/api/recommendations/rules` и `/api/recommendations/jobs` | Каталог правил, запрос очередей рекомендаций. | `RECOMMENDATIONS_SERVICE_URL` |
| `/api/field-selector/[fieldId]/context` | Обогащение истории/почвы/климата для выбранного поля. | `FIELD_SELECTOR_SERVICE_URL` (опционально, fallback на mock) |
| `/api/events/recommendations` / `/events/recommendations` | SSE-прокси поверх Kafka результата рекомендаций. В dev-режиме потоки эмулируются через MSW + `EventSourcePolyfill`. | SSE гейтвей API |

Дополнительные прокси (`/api/history`, `/api/weather`, `/api/satellite/**`) повторно используют общий `apiClient` (`src/lib/apiClient.ts`).

## Переменные окружения

| Переменная | Назначение | Компоненты |
| --- | --- | --- |
| `AUTH_SERVICE_URL` | URL auth сервиса (например, `http://localhost:8000`) | Next.js API routes `/api/auth/**` |
| `RECOMMENDATIONS_SERVICE_URL` | URL сервиса рекомендаций (`http://localhost:8002`) | `/api/recommendations/**` |
| `FIELD_SELECTOR_SERVICE_URL` | Опциональный URL field selector | `/api/field-selector/**` |
| `PLANET_API_KEY` | Ключ для спутниковых данных | `/api/satellite/**` |
| `WEATHER_API_KEY` | Ключ WeatherAPI | `/api/weather` |
| `NEXT_PUBLIC_APP_URL` | Базовый URL клиента | SSR/SSG |
| `NEXT_PUBLIC_API_MOCKING` | `enabled` включает Mock Service Worker и SSE-полифилл | `src/components/MockServiceWorkerProvider.tsx` |

Все значения документированы в `frontend/.env.example`, новый ключ обязательно фиксируем также в `README.md` и `.memory-base/user-docs/info.md`.

## Планировщик и пользовательские флоу

1. **Каталог правил (тикет 0001)** — таб `RuleCatalogTab` загружает `/api/recommendations/rules`, адаптер `mapRuleCatalog()` переводит `crop:`/`family:` ссылки в названия культур. Документировано в `.memory-base/task/front-requiremnets/crop-rotation-rules.md`.
2. **Integrаторы API рекомендаций (тикет 0004)** — `buildQueryPayload()` нормализует историю, профили почвы/климата и extended constraints, UI вызывает `recommendationsApi.queryRecommendations()`. Контракты описаны в `.memory-base/task/front-requiremnets/api-contract-recommendations.md`.
3. **Rule Engine UI (тикет 0005)** — карточки рекомендаций показывают `reasons`, `warnings`, `required_actions`, поддерживают фильтр по приоритету и подсветку источников данных. См. `.memory-base/task/front-requiremnets/rule-engine-ui.md`.
4. **Оркестратор и климатический профиль (тикет 0006)** — `RecommendationsParamsPanel` управляет лимитом, игнором климатического фильтра и признаками органики/сидератов; BFF отдаёт `/api/field-selector/[fieldId]/context`. Документировано в `.memory-base/task/front-requiremnets/recommendation-service-orchestrator.md`.
5. **Событийный поток (тикет 0007)** — `useRecommendationsStream` подписывается на `/events/recommendations`, обновляет Zustand-стор `recommendationsJobs` и панель активности. См. `.memory-base/task/front-requiremnets/recommendations-event-stream.md`.

## Mock Service Worker

- Файл `public/mockServiceWorker.js` синхронизирован с `msw@2.12`.
- `src/components/MockServiceWorkerProvider` автоматически вызывает `initMocks()` в dev-сборке и подменяет `window.EventSource` на `EventSourcePolyfill`, чтобы MSW мог обрабатывать SSE-запросы.
- Основные сценарии (`src/mocks/handlers.ts`):
  - `POST /api/recommendations/query` — успешный ответ + климатический отказ (404, `detail="Не удалось подобрать культуры…"`) для теста CTA «Ослабить фильтры».
  - `GET /api/recommendations/rules` — каталог с `family:` ссылками.
  - `GET /api/field-selector/:fieldId/context` — мок контекста поля.
  - `GET /events/recommendations` — простейший SSE-стрим с `recommendations.result`.

## Тестирование (Vitest + React Testing Library)

`vitest.config.ts` включает jsdom, алиасы `@/*` и `@testing-library/jest-dom`. Покрытые сценарии:

- `services/payloadBuilder.test.ts` — сборка payload, дедупликация истории, валидация почвы и ограничений.
- `services/ruleCatalogAdapter.test.ts` — корректный маппинг `crop:`/`family:` ссылок и устойчивость к неполному каталогу.
- `store/recommendationsJobs.test.ts` — обновление статуса задач и попадание `response` в активные рекомендации.
- `hooks/useRecommendationsStream.test.tsx` — обработка SSE-событий, восстановление Kafka статуса, проброс ошибок.
- `components/RecommendationsErrorState.test.tsx` — UI состояний `403`, `404 history`, «не удалось подобрать культуры» с CTA «Ослабить фильтры».

Запуск: `yarn test` (CI-friendly), `yarn test --coverage` для отчёта `coverage/lcov.info`.
