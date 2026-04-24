#!/usr/bin/env python3
"""
Генерация статических файлов документации OpenAPI.

Запуск:
    python docs/generate_openapi.py

Результат:
    docs/openapi.json  — полная OpenAPI 3.x схема (импортируется в Swagger/Insomnia/Postman)
    docs/openapi.yaml  — то же самое в YAML
    docs/api_reference.md — справочник эндпоинтов в Markdown
"""

import json
import sys
from pathlib import Path

# Добавляем src/ в путь
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from api.main import app

OUT_DIR = Path(__file__).parent

def generate():
    schema = app.openapi()

    # JSON
    json_path = OUT_DIR / "openapi.json"
    json_path.write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {json_path}")

    # YAML
    try:
        import yaml
        yaml_path = OUT_DIR / "openapi.yaml"
        yaml_path.write_text(yaml.dump(schema, allow_unicode=True, sort_keys=False), encoding="utf-8")
        print(f"✓ {yaml_path}")
    except ImportError:
        print("⚠ PyYAML не установлен, YAML-файл не создан. pip install pyyaml")

    # Markdown reference
    md_path = OUT_DIR / "api_reference.md"
    md_lines = [
        "# AeroGuys API — Справочник эндпоинтов\n",
        f"> Версия: `{schema['info']['version']}` | "
        f"Сгенерировано автоматически из OpenAPI-схемы\n",
        "---\n",
    ]

    # Группируем по тегам
    tag_order = [t["name"] for t in schema.get("tags", [])]
    paths_by_tag: dict[str, list] = {}

    for path, methods in schema["paths"].items():
        for method, op in methods.items():
            if method.upper() not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                continue
            tags = op.get("tags", ["Прочие"])
            for tag in tags:
                paths_by_tag.setdefault(tag, []).append((method.upper(), path, op))

    for tag in (tag_order or sorted(paths_by_tag.keys())):
        endpoints = paths_by_tag.get(tag, [])
        if not endpoints:
            continue

        md_lines.append(f"\n## {tag}\n")

        for method, path, op in sorted(endpoints, key=lambda x: x[1]):
            summary = op.get("summary", "")
            description = op.get("description", "")

            md_lines.append(f"\n### `{method} {path}`\n")
            if summary:
                md_lines.append(f"**{summary}**\n")
            if description:
                md_lines.append(f"{description}\n")

            # Параметры
            params = op.get("parameters", [])
            if params:
                md_lines.append("\n**Параметры запроса:**\n")
                md_lines.append("| Имя | В | Тип | Обязательный | Описание |")
                md_lines.append("|-----|---|-----|:---:|---------|")
                for p in params:
                    schema_p = p.get("schema", {})
                    type_ = schema_p.get("type", "any")
                    default = schema_p.get("default", "")
                    if default != "":
                        type_ += f" (default: {default})"
                    required = "✓" if p.get("required") else "—"
                    desc = p.get("description", "")
                    md_lines.append(
                        f"| `{p['name']}` | {p.get('in', '?')} | {type_} | {required} | {desc} |"
                    )

            # Ответы
            responses = op.get("responses", {})
            if responses:
                md_lines.append("\n**Коды ответов:**\n")
                for code, resp in responses.items():
                    resp_desc = resp.get("description", "")
                    md_lines.append(f"- **{code}** — {resp_desc}")

            md_lines.append("")

    md_path.write_text("\n".join(md_lines), encoding="utf-8")
    print(f"✓ {md_path}")

    print("\nДокументация сгенерирована. Интерактивный UI:")
    print("  Swagger UI: http://localhost:8000/api/docs")
    print("  ReDoc:      http://localhost:8000/api/redoc")
    print("  OpenAPI:    http://localhost:8000/api/openapi.json")


if __name__ == "__main__":
    generate()
