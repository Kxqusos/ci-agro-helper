# Техническая документация по правилам рекомендаций

Документ описывает, где хранятся правила севооборота, как формируется OpenAPI и каким образом добавлять новые правила/объяснения.

## Артефакты

- `recommendations/openapi.yaml` — контракт `POST /recommendations/query` и `GET /recommendations/rules`. Содержит схемы `RecommendationQueryPayload`, `RecommendationItem`, `RulesCatalogResponse` и форматы ошибок (`ErrorResponse`).
- `recommendations/data/crop_rotation_rules.json` — каноничный JSON со всеми культурами, источниками и ограничениями.
- `recommendations/data/*_seed.json` — проекции основного файла под таблицы БД (`crops`, `crop_rotation_rules`, `soil_requirements`).
- `recommendations/rule_engine/rules/*.expr` — DSL-правила (DNF, последовательности, отрицания, окна).
- `recommendations/database/seed_rules.py` — скрипт сидирования и валидации.
- `recommendations/tests/rule_engine/` — модульные тесты движка и примеры сложных сценариев.

## Методика обновления правил

1. **Редактируем основной JSON**
   - Добавьте культуру/правило в `recommendations/data/crop_rotation_rules.json`.
   - Обязательно укажите `source_id`, `data_confidence`, требования к почве и несовместимые семейства.
2. **Прогоняем валидацию**
   ```bash
   cd recommendations
   python -m data.validate path/to/crop_rotation_rules.json
   ```
   Скрипт проверит схемы, уникальность идентификаторов и корректность ссылок.
3. **Обновляем сиды**
   ```bash
   python -m database.seed_rules --data-file data/crop_rotation_rules.json
   ```
   Для частичных изменений используйте `--crop-id` и `--dry-run`.
4. **Перегенерируем каталог правил**
   - Запустите `GET /recommendations/rules` локально и сохраните образец для фронтенда.
   - При необходимости обновите `.memory-base/task/front-requiremnets/crop-rotation-rules.md`.
5. **Напишите тест**
   - Добавьте сценарий в `recommendations/tests/rule_engine/test_rule_engine.py` или создайте новый fixture в `tests/fixtures/rule_engine`.
   - Для пользовательских историй добавьте интеграционный тест в `recommendations/tests/api/test_recommendations.py`.

## Добавление новых DSL-правил

1. Создайте файл в `recommendations/rule_engine/rules/` с расширением `.expr`.
2. Описывайте правило в формате:
   ```
   sequence {
     include crop_id=12
     gap seasons=2
     exclude family=solanaceae
   }
   ```
3. Обновите `RuleEngine`/`RuleParser`, чтобы подхватить новый файл (файлы загружаются автоматически по маске).
4. Покройте правило тестом: положите пример истории в `tests/fixtures/rule_engine/dataset.json` и добавьте проверку в `test_rule_engine.py`.

## Объяснения для пользователя

- Каждый `RecommendationItem` содержит:
  - `reasons[]` — список правил, сработавших для данной культуры.
  - `warnings[]` — предупреждения (несовпадение почвы, климатические ограничения, нарушения вращения).
  - `required_actions[]` — что нужно сделать, чтобы рекомендация стала безопасной.
- Для демонстраций используйте сценарий из `.memory-base/user-docs/info.md` («Гид по объяснению рекомендаций») и предоставляйте `request_id` — его можно сопоставить с логами `recommendations.audit`.

## OpenAPI

OpenAPI-файл обновляется вручную. После изменения схем выполните:

```bash
uvicorn main:app --reload --port 8001
openapi-diff https://localhost:8001/openapi.json recommendations/openapi.yaml
```

Ссылка на опубликованный контракт добавлена в README и `index.md`. При изменении полей `RecommendationItem` синхронизируйте фронтенд и документацию.
