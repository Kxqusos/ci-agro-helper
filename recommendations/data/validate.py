#!/usr/bin/env python3
"""
Скрипт валидации JSON файла правил севооборота по схеме
"""

import json
import sys
from pathlib import Path

def validate_json():
    """Валидирует crop_rotation_rules.json по схеме"""

    current_dir = Path(__file__).parent
    schema_path = current_dir / "crop_rotation_rules_schema.json"
    data_path = current_dir / "crop_rotation_rules.json"

    # Проверка существования файлов
    if not schema_path.exists():
        print(f"❌ Схема не найдена: {schema_path}")
        return False

    if not data_path.exists():
        print(f"❌ Файл данных не найден: {data_path}")
        return False

    # Загрузка файлов
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
        print(f"✓ Схема загружена: {schema_path}")
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга схемы: {e}")
        return False

    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✓ Данные загружены: {data_path}")
    except json.JSONDecodeError as e:
        print(f"❌ Ошибка парсинга данных: {e}")
        return False

    # Валидация структуры (базовая проверка без jsonschema)
    print("\n📋 Проверка структуры данных...")

    # Проверка обязательных полей верхнего уровня
    required_fields = ["version", "updated", "crops"]
    for field in required_fields:
        if field not in data:
            print(f"❌ Отсутствует обязательное поле: {field}")
            return False
        print(f"  ✓ {field}: {data[field] if field != 'crops' else f'{len(data[field])} культур'}")

    # Проверка sources
    if "sources" in data:
        print(f"  ✓ sources: {len(data['sources'])} источников")
        for i, source in enumerate(data["sources"], 1):
            if "id" not in source or "title" not in source or "year" not in source:
                print(f"    ❌ Источник {i} не содержит обязательных полей (id, title, year)")
                return False

    # Проверка botanical_families
    if "botanical_families" in data:
        print(f"  ✓ botanical_families: {len(data['botanical_families'])} семейств")

    # Проверка crops
    print(f"\n📊 Проверка данных культур...")

    crop_ids = set()
    for i, crop in enumerate(data["crops"], 1):
        # Проверка обязательных полей
        required_crop_fields = ["crop_id", "crop_name", "botanical_family", "rotation_rules"]
        for field in required_crop_fields:
            if field not in crop:
                print(f"❌ Культура {i}: отсутствует поле {field}")
                return False

        # Проверка дубликатов crop_id
        if crop["crop_id"] in crop_ids:
            print(f"❌ Дубликат crop_id: {crop['crop_id']}")
            return False
        crop_ids.add(crop["crop_id"])

        # Проверка rotation_rules
        rules = crop["rotation_rules"]
        if "return_interval_years" not in rules:
            print(f"❌ Культура {crop['crop_name']}: нет return_interval_years")
            return False

        interval = rules["return_interval_years"]
        if "min" not in interval or "recommended" not in interval:
            print(f"❌ Культура {crop['crop_name']}: некорректный return_interval_years")
            return False

        if interval["min"] > interval["recommended"]:
            print(f"❌ Культура {crop['crop_name']}: min > recommended в return_interval_years")
            return False

        # Проверка предшественников
        predecessors_count = {
            "good": len(rules.get("good_predecessors", [])),
            "acceptable": len(rules.get("acceptable_predecessors", [])),
            "bad": len(rules.get("bad_predecessors", []))
        }

        # Минимум 3 good или bad предшественника
        if predecessors_count["good"] < 3 and predecessors_count["bad"] < 3:
            if "notes" not in rules or "data_confidence" not in rules:
                print(f"⚠️  Культура {crop['crop_name']}: менее 3 good/bad предшественников, но нет обоснования в notes")

        print(f"  ✓ {crop['crop_name']} (id: {crop['crop_id']}): "
              f"good={predecessors_count['good']}, "
              f"acceptable={predecessors_count['acceptable']}, "
              f"bad={predecessors_count['bad']}")

    print(f"\n✅ Валидация успешна!")
    print(f"\n📈 Статистика:")
    print(f"  - Культур: {len(data['crops'])}")
    print(f"  - Источников: {len(data.get('sources', []))}")
    print(f"  - Ботанических семейств: {len(data.get('botanical_families', {}))}")

    return True

if __name__ == "__main__":
    success = validate_json()
    sys.exit(0 if success else 1)
