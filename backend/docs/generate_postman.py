#!/usr/bin/env python3
"""
Генерация Postman-коллекции из схемы OpenAPI.

Запуск:
    python docs/generate_postman.py

Результат:
    docs/AeroGuys_API.postman_collection.json
"""

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from api.main import app

OUT_DIR = Path(__file__).parent
BASE_URL = "{{BASE_URL}}"  # Postman переменная


def _item(method: str, path: str, op: dict) -> dict:
    name = op.get("summary") or path

    # Заменяем path-параметры {xxx} на :xxx для Postman
    postman_path = path.replace("{", ":").replace("}", "")
    # Разбиваем на сегменты
    raw_segments = [s for s in postman_path.split("/") if s]

    # Query-параметры
    query_params = []
    for p in op.get("parameters", []):
        if p.get("in") == "query":
            schema_p = p.get("schema", {})
            default = schema_p.get("default", "")
            query_params.append({
                "key": p["name"],
                "value": str(default) if default != "" else "",
                "description": p.get("description", ""),
                "disabled": not p.get("required", False),
            })

    item: dict = {
        "name": name,
        "request": {
            "method": method.upper(),
            "header": [],
            "url": {
                "raw": f"{BASE_URL}/{'/'.join(raw_segments)}"
                        + ("?" + "&".join(f"{p['key']}={p['value']}" for p in query_params if not p['disabled'])
                           if query_params else ""),
                "host": [BASE_URL],
                "path": raw_segments,
                "query": query_params,
            },
            "description": op.get("description", ""),
        },
        "response": [],
    }

    return item


def generate():
    schema = app.openapi()

    # Группируем по тегам
    tag_order = [t["name"] for t in schema.get("tags", [])]
    folders: dict[str, list] = {}

    for path, methods in schema["paths"].items():
        for method, op in methods.items():
            if method.upper() not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                continue
            tags = op.get("tags", ["Прочие"])
            for tag in tags:
                folders.setdefault(tag, []).append(_item(method, path, op))

    collection_items = []
    for tag in (tag_order or sorted(folders.keys())):
        if tag not in folders:
            continue
        collection_items.append({
            "name": tag,
            "item": folders[tag],
            "_postman_isSubFolder": False,
        })

    collection = {
        "info": {
            "_postman_id": str(uuid.uuid4()),
            "name": "AeroGuys API",
            "description": schema["info"]["description"],
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": collection_items,
        "variable": [
            {
                "key": "BASE_URL",
                "value": "http://localhost:8000",
                "type": "string",
            }
        ],
    }

    out_path = OUT_DIR / "AeroGuys_API.postman_collection.json"
    out_path.write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {out_path}")
    print("\nИмпортируйте файл в Postman: File → Import → файл .json")
    print("Переменная BASE_URL по умолчанию: http://localhost:8000")


if __name__ == "__main__":
    generate()
