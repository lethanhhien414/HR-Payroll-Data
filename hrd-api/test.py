import pyodbc

try:
    conn = pyodbc.connect(
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=(localdb)\\MSSQLLocalDB;"
        "DATABASE=HUMAN_2025;"
        "Trusted_Connection=yes;"
    )
    print("✅ CONNECT OK")
except Exception as e:
    print("❌ ERROR:", e)