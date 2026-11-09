import mysql.connector

def get_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            port=3306,
            user="root",
            password="260116",
            database="payroll_2026",
            autocommit=False
        )
        return conn

    except Exception as e:
        print("Lỗi MySQL:", str(e))
        raise