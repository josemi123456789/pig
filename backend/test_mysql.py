import mysql.connector

passwords_to_test = ["", "root", "123456", "admin", "12345"]

print("Testing common passwords for root@127.0.0.1...")

for pwd in passwords_to_test:
    try:
        # Just try to connect to the server, not a specific DB yet
        conexion = mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password=pwd
        )
        print(f"Success with password: '{pwd}'")
        conexion.close()
        break
    except mysql.connector.Error as err:
        print(f"Failed with password: '{pwd}' - {err}")
