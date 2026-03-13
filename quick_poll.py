import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent / "backend" / "src"))

from DB.dbManager import DatabaseManager
from DB.schema import init_schema
from OpenskyAPI.tokenManager import TokenManager
from parsing.data_collector import DataCollector
from parsing.default_configs import get_full_world_config

def main():
    print("=" * 70)
    print("OPENSKY QUICK POLL - World Data Collection")
    print("=" * 70)
    print(f"Started at: {datetime.now()}")
    print()
    
    config = get_full_world_config()
    
    print("\nInitializing...")

    db = DatabaseManager()
    tm = TokenManager()
    
    try:
        with db.get_cursor() as cursor:
            cursor.execute("SELECT 1 FROM snapshots LIMIT 1")
    except Exception:
        print("Database schema not found. Initializing...")
        if not init_schema(db):
            print("Failed to initialize schema!")
            return
    
    collector = DataCollector(db, tm, config)
    
    print("\n" + "=" * 70)
    print("Starting data collection...")
    print("=" * 70 + "\n")
    
    stats = collector.run_poll()

    print("\n" + "=" * 70)
    print("COLLECTION COMPLETE")
    print("=" * 70)
    print(f"Time:            {stats['timestamp']}")
    print(f"States:          {stats['states_collected']:,}")
    print(f"Flights:         {stats['flights_collected']:,}")
    print(f"Tracks:          {stats['tracks_collected']:,}")
    print("=" * 70)

    remaining = collector.client.get_remaining_credits()
    if remaining is not None:
        print(f"\nRemaining API credits: {remaining:,}")
    
    db.close_all_connections()
    print("\nDone! ✓")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCancelled by user")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()