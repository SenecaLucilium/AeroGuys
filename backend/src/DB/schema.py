import logging
from pathlib import Path
from .dbManager import DatabaseManager

logger = logging.getLogger(__name__)

SQL_DIR = Path(__file__).parent / "sql"

def _read_sql(filename: str) -> str:
    filepath = SQL_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def _get_migration_files() -> list[str]:
    if not SQL_DIR.exists():
        raise FileNotFoundError(f"SQL directory not found: {SQL_DIR}")
    
    files = sorted(f.name for f in SQL_DIR.iterdir() if f.suffix == ".sql")
    return files


def init_schema(db: DatabaseManager) -> bool:
    try:
        files = _get_migration_files()
        
        with db.get_cursor() as cursor:
            for filename in files:
                sql = _read_sql(filename)
                cursor.execute(sql)
                logger.info(f"Applied: {filename}")
        
        return True
    
    except Exception as error:
        print(f"Schema init error: {error}")
        return False

def drop_all(db: DatabaseManager) -> bool:
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                DROP TABLE IF EXISTS waypoints CASCADE;
                DROP TABLE IF EXISTS flight_tracks CASCADE;
                DROP TABLE IF EXISTS flights CASCADE;
                DROP TABLE IF EXISTS state_vectors CASCADE;
                DROP TABLE IF EXISTS snapshots CASCADE;
                DROP TABLE IF EXISTS airports CASCADE;
            """)
        return True
    
    except Exception as error:
        print(f"Drop error: {error}")
        return False