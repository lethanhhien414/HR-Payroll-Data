import pyodbc

def get_sqlserver_connection():
    try:
        conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=(localdb)\\MSSQLLocalDB;"
    "DATABASE=HUMAN_2025;"
    "Trusted_Connection=yes;"
)
        return conn

    except Exception as e:
        print("Lỗi SQL Server:", str(e))
        raise