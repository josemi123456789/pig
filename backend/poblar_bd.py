import mysql.connector
import numpy as np
import random

def poblar_base_de_datos():
    # 1. Conexión inicial sin especificar base de datos para poder crearla
    try:
        conexion = mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password="" # Contraseña vacía (XAMPP / WAMP por defecto)
        )
        cursor = conexion.cursor()
        print("Conectado a MySQL exitosamente.")
        
        # Crear base de datos si no existe y usarla
        cursor.execute("CREATE DATABASE IF NOT EXISTS alerta_temprana")
        cursor.execute("USE alerta_temprana")
        
        # Crear tabla si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS estudiantes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100),
                promedio_actual FLOAT,
                tareas_no_entregadas INT,
                reprobaciones_previas INT,
                dias_desde_ultima_conexion INT,
                minutos_uso_semanal INT,
                dias_atraso_pagos INT,
                tipo_matricula_beca INT,
                nivel_socioeconomico VARCHAR(50),
                modalidad_matricula VARCHAR(50),
                desercion INT
            )
        """)
        print("Base de datos y tabla preparadas.")
        
    except Exception as e:
        print(f"Error al conectar a la base de datos: {e}")
        return

    np.random.seed(42)
    random.seed(42)
    n_samples = 10000
    
    nombres = ["Juan", "Maria", "Pedro", "Ana", "Luis", "Carlos", "Sofia", "Jorge", "Lucia", "Elena", "Diego", "Paula", "Mateo", "Camila"]
    apellidos = ["Perez", "Gomez", "Lopez", "Diaz", "Martinez", "Rodriguez", "Fernandez", "Garcia", "Sanchez", "Romero"]

    valores = []
    print("Generando datos...")
    
    for _ in range(n_samples):
        nombre_completo = f"{random.choice(nombres)} {random.choice(apellidos)}"
        desercion = int(np.random.choice([0, 1], p=[0.85, 0.15])) 

        if desercion == 1:
            promedio = float(round(np.random.uniform(1.0, 5.5), 1))
            tareas = int(np.random.randint(5, 16))
            reprobaciones = int(np.random.randint(2, 6))
            dias_conexion = int(np.random.randint(15, 61))
            minutos = int(np.random.randint(0, 150))
            dias_pagos = int(np.random.randint(10, 121))
            beca = int(np.random.choice([0, 1], p=[0.9, 0.1]))
            nivel = str(np.random.choice(["Bajo", "Medio", "Alto"], p=[0.7, 0.2, 0.1]))
            modalidad = str(np.random.choice(["Ordinaria", "Extraordinaria"], p=[0.3, 0.7]))
        else:
            promedio = float(round(np.random.uniform(7.0, 10.0), 1))
            tareas = int(np.random.randint(0, 3))
            reprobaciones = int(np.random.randint(0, 2))
            dias_conexion = int(np.random.randint(0, 7))
            minutos = int(np.random.randint(300, 1201))
            dias_pagos = int(np.random.randint(0, 10))
            beca = int(np.random.choice([0, 1], p=[0.3, 0.7]))
            nivel = str(np.random.choice(["Bajo", "Medio", "Alto"], p=[0.2, 0.5, 0.3]))
            modalidad = str(np.random.choice(["Ordinaria", "Extraordinaria"], p=[0.8, 0.2]))

        valores.append((nombre_completo, promedio, tareas, reprobaciones, dias_conexion, minutos, dias_pagos, beca, nivel, modalidad, desercion))

    # 2. Inserción Masiva (executemany)
    print("Insertando 10,000 registros en la base de datos. Por favor espera...")
    consulta_sql = """
        INSERT INTO estudiantes 
        (nombre, promedio_actual, tareas_no_entregadas, reprobaciones_previas, dias_desde_ultima_conexion, minutos_uso_semanal, dias_atraso_pagos, tipo_matricula_beca, nivel_socioeconomico, modalidad_matricula, desercion) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    try:
        # executemany es la forma profesional de insertar miles de datos a la vez
        cursor.executemany(consulta_sql, valores)
        conexion.commit() # Confirmar los cambios
        print(f"Exito! Se insertaron {cursor.rowcount} estudiantes en la tabla.")
    except Exception as e:
        print(f"Error durante la inserción: {e}")
    finally:
        # Siempre es buena práctica cerrar la conexión al terminar
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conexion' in locals() and conexion.is_connected():
            conexion.close()

if __name__ == "__main__":
    poblar_base_de_datos()
