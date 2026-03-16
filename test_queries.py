#!/usr/bin/env python3
"""
Тестирование всех функций модуля queries.py
Запуск: python test_queries.py
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import time

sys.path.insert(0, str(Path(__file__).parent / "backend" / "src" ))

from DB.dbManager import DatabaseManager
from Analysis.queries import DatabaseQueries


def print_header(text):
    """Красивый вывод заголовка"""
    print("\n" + "="*80)
    print(f" 🔍 {text}")
    print("="*80)


def print_result(name, result):
    """Вывод результата теста"""
    if result is None:
        print(f"❌ {name}: None")
        return
    
    status = "✅" if result else "❌"
    
    # Обработка разных типов данных
    if isinstance(result, dict):
        if result:
            print(f"{status} {name}: словарь с {len(result)} элементами")
            # Покажем несколько примеров
            items = list(result.items())[:3]
            for k, v in items:
                print(f"   {k}: {v}")
        else:
            print(f"{status} {name}: пустой словарь")
    
    elif isinstance(result, list):
        if result:
            print(f"{status} {name}: найдено {len(result)} записей")
            if len(result) > 0:
                # Покажем пример первой записи
                first = result[0]
                if hasattr(first, '__dict__'):
                    # Это объект класса
                    attrs = vars(first)
                    attrs_str = ', '.join([f"{k}={v}" for k, v in list(attrs.items())[:3]])
                    print(f"   Пример: {attrs_str}...")
                else:
                    print(f"   Пример: {first}")
        else:
            print(f"{status} {name}: нет данных")
    
    elif isinstance(result, (int, float, str, bool)):
        print(f"{status} {name}: {result}")
    
    else:
        print(f"{status} {name}: {type(result)}")


def test_flights_queries(queries):
    """Тестирование запросов полетов"""
    print_header("ТЕСТ 1: ЗАПРОСЫ ПОЛЕТОВ")
    
    # Рассчитываем временной диапазон
    end_time = datetime.now()
    start_time = end_time - timedelta(days=7)
    
    # 1.1 Полеты по аэропорту (пробуем разные варианты)
    test_airports = ['UUEE', 'EDDF', 'LFPG', 'EGLL']  # Шереметьево, Франкфурт, Париж, Лондон
    found_any = False
    
    for airport in test_airports:
        flights = queries.get_flights_by_airport(
            airport, 
            start_time=start_time,
            end_time=end_time,
            flight_type='both'
        )
        if flights:
            print_result(f"Полеты через {airport}", flights)
            found_any = True
            # Покажем пример данных
            if flights and len(flights) > 0:
                f = flights[0]
                print(f"   Пример: {f.callsign} {f.departure_airport or '??'} -> {f.arrival_airport or '??'}")
            break
    
    if not found_any:
        print("ℹ️ Полеты по аэропортам не найдены (нужно больше данных)")
    
    # 1.2 Полеты по маршруту
    route = queries.get_flights_by_route(
        'UUEE', 'UUDD',  # Москва → Домодедово (пример)
        start_time=start_time,
        end_time=end_time
    )
    print_result("Полеты по маршруту", route)
    
    # 1.3 Полеты самолета
    # Сначала получим какой-нибудь ICAO24 из базы
    with queries.db.get_cursor() as cursor:
        cursor.execute("SELECT icao24 FROM flights LIMIT 1")
        row = cursor.fetchone()
        if row:
            icao24 = row[0]
            aircraft_flights = queries.get_flights_by_aircraft(
                icao24,
                start_time=start_time,
                end_time=end_time,
                limit=100
            )
            print_result(f"Полеты самолета {icao24}", aircraft_flights)
        else:
            print("ℹ️ Нет данных о полетах для теста самолета")


def test_current_positions(queries):
    """Тестирование текущих позиций"""
    print_header("ТЕСТ 2: ТЕКУЩИЕ ПОЗИЦИИ")
    
    # 2.1 Все позиции
    all_positions = queries.get_current_positions(limit=50)
    print_result("Все позиции", all_positions)
    
    if all_positions and len(all_positions) > 0:
        # Покажем пример данных
        p = all_positions[0]
        print(f"   Пример: {p.callsign or 'N/A'} @ {p.latitude:.2f}, {p.longitude:.2f}, {p.altitude:.0f}м")
    
    # 2.2 Только в воздухе
    airborne = queries.get_current_positions(airborne_only=True, limit=50)
    print_result("Только в воздухе", airborne)
    
    # 2.3 Только на земле
    on_ground = queries.get_current_positions(on_ground_only=True, limit=50)
    print_result("Только на земле", on_ground)
    
    # 2.4 Поиск по региону (Европа)
    europe = queries.get_current_positions(
        min_lat=35.0, max_lat=70.0,
        min_lon=-10.0, max_lon=40.0,
        limit=50
    )
    print_result("Европа", europe)
    
    # 2.5 Высоко летящие (> 8000м)
    high_altitude = queries.get_current_positions(min_altitude=8000, limit=50)
    print_result("Высота > 8000м", high_altitude)


def test_aircraft_search(queries):
    """Тестирование поиска по позывным"""
    print_header("ТЕСТ 3: ПОИСК ПО ПОЗЫВНЫМ")
    
    # Пробуем разные популярные позывные
    test_callsigns = ['AFL', 'SBI', 'RYR', 'DLH', 'BAW']
    found_any = False
    
    for callsign in test_callsigns:
        aircraft = queries.get_aircraft_by_callsign(callsign)
        if aircraft:
            print_result(f"Поиск '{callsign}'", aircraft)
            print(f"   Найден: {aircraft.callsign} ({aircraft.icao24})")
            found_any = True
            break
    
    if not found_any:
        print("ℹ️ Самолеты по позывным не найдены")


def test_statistics(queries):
    """Тестирование статистических функций"""
    print_header("ТЕСТ 4: СТАТИСТИКА")
    
    # 4.1 Статистика по аэропортам
    airport_stats = queries.get_airport_stats(days=7)
    print_result("Статистика аэропортов", airport_stats)
    
    if airport_stats and len(airport_stats) > 0:
        print("\n   Топ-5 аэропортов:")
        for i, s in enumerate(airport_stats[:5], 1):
            print(f"   {i}. {s.airport}: {s.total_flights} рейсов (⬆️{s.departures} ⬇️{s.arrivals})")
    
    # 4.2 Почасовой трафик (все аэропорты)
    hourly = queries.get_traffic_hourly(days=7)
    print_result("Почасовой трафик (все)", hourly)
    
    if hourly and len(hourly) > 0:
        # Найдем часы пик
        sorted_hours = sorted(hourly.items(), key=lambda x: x[1], reverse=True)
        print(f"   Час пик: {sorted_hours[0][0]}:00 - {sorted_hours[0][1]} рейсов")
        
        # Покажем распределение по часам
        print("   Распределение по часам:")
        for hour in range(0, 24, 3):  # Каждые 3 часа
            count = hourly.get(hour, 0)
            bar = "█" * (count // 10)
            print(f"   {hour:02d}:00-{hour+2:02d}:59: {bar} ({count})")
    
    # 4.3 Почасовой трафик для конкретного аэропорта
    if airport_stats and len(airport_stats) > 0:
        top_airport = airport_stats[0].airport
        hourly_airport = queries.get_traffic_hourly(airport=top_airport, days=7)
        print_result(f"Почасовой трафик {top_airport}", hourly_airport)
    
    # 4.4 Топ авиакомпаний
    airlines = queries.get_top_airlines(limit=10)
    print_result("Топ авиакомпаний", airlines)
    
    if airlines and len(airlines) > 0:
        print("\n   Топ-5 авиакомпаний:")
        for i, (code, count) in enumerate(airlines[:5], 1):
            # Расшифровка кодов
            names = {
                'AFL': 'Аэрофлот',
                'SBI': 'S7 Airlines',
                'RYR': 'Ryanair',
                'DLH': 'Lufthansa',
                'BAW': 'British Airways',
                'UAE': 'Emirates',
                'FDX': 'FedEx',
                'UPS': 'UPS',
                'SWA': 'Southwest',
                'DAL': 'Delta',
                'UAL': 'United',
                'THY': 'Turkish Airlines',
                'KLM': 'KLM',
                'AFR': 'Air France'
            }
            name = names.get(code, 'неизвестно')
            print(f"   {i}. {code} ({name}): {count} рейсов")


def test_tracks(queries):
    """Тестирование треков"""
    print_header("ТЕСТ 5: ТРЕКИ ПОЛЕТОВ")
    
    # Найдем какой-нибудь полет с треком
    with queries.db.get_cursor() as cursor:
        cursor.execute("""
            SELECT f.id, f.callsign 
            FROM flights f
            JOIN flight_tracks ft ON ft.icao24 = f.icao24 
                AND ft.start_time <= f.last_seen 
                AND ft.end_time >= f.first_seen
            LIMIT 1
        """)
        row = cursor.fetchone()
        
        if row:
            flight_id, callsign = row
            track = queries.get_flight_track(flight_id)
            print_result(f"Трек полета {callsign or flight_id}", track)
            
            if track and len(track) > 0:
                print(f"   Длина трека: {len(track)} точек")
                print(f"   Время: {track[0]['time']} → {track[-1]['time']}")
                print(f"   Маршрут: {track[0]['lat']:.2f},{track[0]['lon']:.2f} → "
                      f"{track[-1]['lat']:.2f},{track[-1]['lon']:.2f}")
        else:
            print("ℹ️ Треки не найдены (нужно собрать больше данных с collect_tracks=True)")


def test_export(queries):
    """Тестирование экспорта"""
    print_header("ТЕСТ 6: ЭКСПОРТ")
    
    test_filename = f'test_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    end_time = datetime.now()
    start_time = end_time - timedelta(days=1)
    
    try:
        queries.export_flights_to_csv(start_time, end_time, test_filename)
        
        # Проверим, что файл создался
        if Path(test_filename).exists():
            size = Path(test_filename).stat().st_size
            print(f"✅ Экспорт: файл {test_filename} создан ({size} байт)")
            
            if size > 0:
                # Покажем первые строки
                with open(test_filename, 'r', encoding='utf-8') as f:
                    lines = list(f.readlines())[:3]
                    print("   Первые строки файла:")
                    for line in lines:
                        print(f"   {line.strip()}")
            else:
                print("   Файл пуст (нет данных за указанный период)")
        else:
            print("❌ Экспорт: файл не создан")
            
    except Exception as e:
        print(f"❌ Экспорт: ошибка - {e}")


def test_direct_sql(queries):
    """Тестирование прямых SQL запросов для проверки структуры"""
    print_header("ТЕСТ 7: ПРОВЕРКА СТРУКТУРЫ БД")
    
    with queries.db.get_cursor() as cursor:
        # 7.1 Количество записей в таблицах
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM snapshots) as snapshots,
                (SELECT COUNT(*) FROM state_vectors) as state_vectors,
                (SELECT COUNT(*) FROM flights) as flights,
                (SELECT COUNT(*) FROM flight_tracks) as tracks,
                (SELECT COUNT(*) FROM waypoints) as waypoints
        """)
        counts = cursor.fetchone()
        print("📊 Статистика базы данных:")
        print(f"   Snapshots:     {counts[0]}")
        print(f"   State Vectors: {counts[1]}")
        print(f"   Flights:       {counts[2]}")
        print(f"   Tracks:        {counts[3]}")
        print(f"   Waypoints:     {counts[4]}")
        
        # 7.2 Последний снапшот
        cursor.execute("""
            SELECT id, TO_TIMESTAMP(api_timestamp), aircraft_count 
            FROM snapshots 
            ORDER BY id DESC LIMIT 1
        """)
        last = cursor.fetchone()
        if last:
            print(f"\n📸 Последний снапшот #{last[0]}:")
            print(f"   Время: {last[1]}")
            print(f"   Самолетов: {last[2]}")
        
        # 7.3 Диапазон дат полетов
        cursor.execute("""
            SELECT 
                MIN(TO_TIMESTAMP(first_seen)) as oldest,
                MAX(TO_TIMESTAMP(last_seen)) as newest,
                COUNT(DISTINCT icao24) as unique_aircraft
            FROM flights
        """)
        date_range = cursor.fetchone()
        if date_range[0]:
            print(f"\n📅 Диапазон данных полетов:")
            print(f"   С: {date_range[0]}")
            print(f"   По: {date_range[1]}")
            print(f"   Уникальных самолетов: {date_range[2]}")
        
        # 7.4 Топ-5 аэропортов по активности
        cursor.execute("""
            SELECT 
                COALESCE(est_departure_airport, est_arrival_airport) as airport,
                COUNT(*) as total
            FROM flights
            WHERE est_departure_airport IS NOT NULL OR est_arrival_airport IS NOT NULL
            GROUP BY airport
            ORDER BY total DESC
            LIMIT 5
        """)
        top_airports = cursor.fetchall()
        if top_airports:
            print(f"\n🏆 Топ-5 аэропортов в базе:")
            for i, (airport, count) in enumerate(top_airports, 1):
                print(f"   {i}. {airport}: {count} рейсов")


def main():
    """Главная функция тестирования"""
    print("="*80)
    print("🧪  ТЕСТИРОВАНИЕ МОДУЛЯ DATABASE QUERIES  🧪")
    print("="*80)
    print(f"Начало тестирования: {datetime.now()}")
    
    try:
        # Подключение к БД
        print("\n🔄 Подключение к базе данных...")
        db = DatabaseManager()
        queries = DatabaseQueries(db)
        
        if not db.test_connection():
            print("❌ Не удалось подключиться к БД")
            return
        
        print("✅ Подключение успешно!")
        
        # Запуск всех тестов
        test_direct_sql(queries)
        test_flights_queries(queries)
        test_current_positions(queries)
        test_aircraft_search(queries)
        test_statistics(queries)
        test_tracks(queries)
        test_export(queries)
        
        # Итог
        print_header("ИТОГ ТЕСТИРОВАНИЯ")
        print("✅ Тестирование завершено!")
        print("\n📝 Рекомендации:")
        print("• Если много 'нет данных' - запустите quick_poll.py несколько раз")
        print("• Для треков нужен сбор с collect_tracks=True")
        print("• Статистика появится после накопления данных за несколько дней")
        
    except Exception as e:
        print(f"\n❌ Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if 'db' in locals():
            db.close_all_connections()
            print("\n🔌 Соединения с БД закрыты")


if __name__ == "__main__":
    main()