import pandas as pd
import numpy as np
import os

def generate_dataset(num_records=100):
    np.random.seed(42)
    data = []
    
    for _ in range(num_records):
        desercion = np.random.choice([0, 1], p=[0.7, 0.3])
        noise = np.random.rand() < 0.10
        apply_dropout_rules = (desercion == 1 and not noise) or (desercion == 0 and noise)
        
        if apply_dropout_rules:
            promedio_actual = np.clip(np.random.normal(4.0, 1.5), 0.0, 10.0)
            tareas_no_entregadas = np.clip(np.random.randint(6, 16), 0, 15)
            reprobaciones_previas = np.clip(np.random.randint(1, 6), 0, 5)
            dias_desde_ultima_conexion = np.clip(np.random.randint(15, 61), 0, 60)
            minutos_uso_semanal = np.clip(np.random.randint(0, 100), 0, 1200)
            dias_atraso_pagos = np.clip(np.random.randint(30, 121), 0, 120)
        else:
            promedio_actual = np.clip(np.random.normal(8.5, 1.0), 0.0, 10.0)
            tareas_no_entregadas = np.clip(np.random.randint(0, 3), 0, 15)
            reprobaciones_previas = np.clip(np.random.randint(0, 2), 0, 5)
            dias_desde_ultima_conexion = np.clip(np.random.randint(0, 5), 0, 60)
            minutos_uso_semanal = np.clip(np.random.randint(300, 1201), 0, 1200)
            dias_atraso_pagos = np.clip(np.random.randint(0, 15), 0, 120)
            
        tipo_matricula_beca = np.random.choice([0, 1], p=[0.8, 0.2] if apply_dropout_rules else [0.4, 0.6])
        nivel_socioeconomico = np.random.choice(["Bajo", "Medio", "Alto"], p=[0.6, 0.3, 0.1] if apply_dropout_rules else [0.2, 0.5, 0.3])
        modalidad_matricula = np.random.choice(["Ordinaria", "Extraordinaria"], p=[0.7, 0.3])
        
        data.append({
            "promedio_actual": round(promedio_actual, 1),
            "tareas_no_entregadas": int(tareas_no_entregadas),
            "reprobaciones_previas": int(reprobaciones_previas),
            "dias_desde_ultima_conexion": int(dias_desde_ultima_conexion),
            "minutos_uso_semanal": int(minutos_uso_semanal),
            "dias_atraso_pagos": int(dias_atraso_pagos),
            "tipo_matricula_beca": int(tipo_matricula_beca),
            "nivel_socioeconomico": nivel_socioeconomico,
            "modalidad_matricula": modalidad_matricula,
            "desercion": int(desercion)
        })
        
    df = pd.DataFrame(data)
    # Get current script dir to place data there
    current_dir = os.path.dirname(os.path.abspath(__file__))
    df.to_csv(os.path.join(current_dir, "dataset_desercion_final.csv"), index=False)

if __name__ == "__main__":
    generate_dataset(100)
