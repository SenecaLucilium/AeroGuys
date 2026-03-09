import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

class DatabaseManager:
    def __init__(self):
        self.connection_pool = None
        self._init_pool()
    
    def _init_pool(self):
        try:
            self.connection_pool = psycopg2.pool.SimpleConnectionPool(
                1,
                20,
                host=os.getenv('DB_HOST'),
                port=os.getenv('DB_PORT'),
                database=os.getenv('DB_NAME'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD')
            )

            if self.connection_pool:
                print("Пул соединений с PostgreSQL (Docker) создан успешно")
        except (Exception, psycopg2.DatabaseError) as error:
            print(f"Ошибка при создания пула соединений: {error}")
            raise
    
    @contextmanager
    def get_cursor(self, cursor_factory=None):
        """
        Использование:
            with db.get_cursor() as cursor:
                cursor.execute("SELECT * FROM table")
        """

        connection = self.connection_pool.getconn()

        try:
            cursor = connection.cursor(cursor_factory=cursor_factory)
            yield cursor
            connection.commit()
        except Exception as e:
            connection.rollback()
            raise e
        finally:
            cursor.close()
            self.connection_pool.putconn(connection)
    
    def execute_query(self, query, params=None, fetch=False):
        """
        Args:
            query: SQL запрос
            params: Параметры запроса (tuple или dict)
            fetch: True - вернуть результат, False - только выполнить
        
        Returns:
            Результат запроса или None
        """

        try:
            with self.get_cursor(cursor_factory=RealDictCursor if fetch else None) as cursor:
                cursor.execute(query, params)
                
                if fetch:
                    return cursor.fetchall()

                return True
        except (Exception, psycopg2.DatabaseError) as error:
            print(f"Ошибка при выполнении запроса: {error}")
            return None
    
    def close_all_connections(self):
        if self.connection_pool:
            self.connection_pool.closeall()

    def test_connection(self):
        try:
            with self.get_cursor() as cursor:
                cursor.execute('SELECT version();')
                db_version = cursor.fetchone()[0]
                
                print("=" * 70)
                print("Подключение к PostgreSQL (Docker) успешно!")
                print(f"Версия БД: {db_version}")
                print("=" * 70)
                
                cursor.execute("""
                    SELECT 
                        current_database() as db_name,
                        current_user as user_name,
                        inet_server_addr() as host,
                        inet_server_port() as port
                """)
                info = cursor.fetchone()
                
                print(f"База данных: {info[0]}")
                print(f"Пользователь: {info[1]}")
                print(f"Хост: {info[2] if info[2] else 'localhost (Docker)'}")
                print(f"Порт: {info[3]}")
                print("=" * 70)
                
                return True
                
        except (Exception, psycopg2.DatabaseError) as error:
            print(f"Ошибка при проверке подключения: {error}")
            return False

    def get_db_info(self):
        try:
            with self.get_cursor() as cursor:
                cursor.execute("""SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;""")
                db_size = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public';
                """)
                tables_count = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT 
                        tablename,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
                """)
                tables = cursor.fetchall()
                
                print("\n" + "=" * 70)
                print("ИНФОРМАЦИЯ О БАЗЕ ДАННЫХ (Docker)")
                print("=" * 70)
                print(f"Размер БД: {db_size}")
                print(f"Количество таблиц: {tables_count}")
                
                if tables:
                    print(f"\nСписок таблиц:")
                    for table in tables:
                        print(f"   • {table[0]:<30} {table[1]:>10}")
                else:
                    print("\nТаблицы отсутствуют")
                
                print("=" * 70)
                
        except (Exception, psycopg2.DatabaseError) as error:
            print(f"Ошибка при получении информации о БД: {error}")