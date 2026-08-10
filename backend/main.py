# Server reload trigger
from fastapi import FastAPI, HTTPException, UploadFile, File
from sqlalchemy import create_engine, text
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
import io
import os
from schemas import PredictRequest, PredictResponse

app = FastAPI(title="API Sistema de Alerta Temprana")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variables globales
model = None
encoders = None

@app.on_event("startup")
def load_artifacts():
    global model, encoders
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, 'ml', 'saved_models', 'rf_model.pkl')
    encoders_path = os.path.join(base_dir, 'ml', 'saved_models', 'encoders.pkl')
    
    try:
        model = joblib.load(model_path)
        encoders = joblib.load(encoders_path)
        print("Artefactos de ML cargados correctamente.")
    except Exception as e:
        print(f"Error al cargar los modelos: {e}")

@app.post("/predict/", response_model=PredictResponse)
def predict(data: PredictRequest):
    if model is None or encoders is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado.")
        
    try:
        # Preparar datos
        input_data = {
            'promedio_actual': [data.promedio_actual],
            'tareas_no_entregadas': [data.tareas_no_entregadas],
            'reprobaciones_previas': [data.reprobaciones_previas],
            'dias_desde_ultima_conexion': [data.dias_desde_ultima_conexion],
            'minutos_uso_semanal': [data.minutos_uso_semanal],
            'dias_atraso_pagos': [data.dias_atraso_pagos],
            'tipo_matricula_beca': [data.tipo_matricula_beca],
            'nivel_socioeconomico': [data.nivel_socioeconomico],
            'modalidad_matricula': [data.modalidad_matricula]
        }
        df = pd.DataFrame(input_data)
        
        # Aplicar codificadores
        for col in ['tipo_matricula_beca', 'nivel_socioeconomico', 'modalidad_matricula']:
            if df[col][0] not in encoders[col].classes_:
                # Si el valor no fue visto, usar el primero como fallback (o lanzar error)
                df[col] = encoders[col].transform([encoders[col].classes_[0]])
            else:
                df[col] = encoders[col].transform(df[col])
                
        # Predicción
        pred = model.predict(df)[0]
        prob = model.predict_proba(df)[0][1] # Prob de clase 1
        
        riesgo = "Alto" if pred == 1 else "Bajo"
        
        return PredictResponse(
            prediccion=int(pred),
            probabilidad=float(prob),
            riesgo=riesgo
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la predicción: {str(e)}")

@app.post("/predict/batch/")
async def predict_batch(file: UploadFile = File(...)):
    if model is None or encoders is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado.")
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        required_cols = [
            'promedio_actual', 'tareas_no_entregadas', 'reprobaciones_previas', 
            'dias_desde_ultima_conexion', 'minutos_uso_semanal', 'dias_atraso_pagos', 
            'tipo_matricula_beca', 'nivel_socioeconomico', 'modalidad_matricula'
        ]
        
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Faltan columnas requeridas: {missing_cols}")
            
        results_df = df.copy() 
        
        for col in ['tipo_matricula_beca', 'nivel_socioeconomico', 'modalidad_matricula']:
            if col in df.columns:
                valid_classes = encoders[col].classes_
                default_class = valid_classes[0]
                df[col] = np.where(df[col].isin(valid_classes), df[col], default_class)
                df[col] = encoders[col].transform(df[col])
                
        # Filtrar estrictamente solo las 9 columnas para el modelo (ignora extras automáticamente)
        X = df[required_cols]
        
        preds = model.predict(X)
        probs = model.predict_proba(X)[:, 1]
        
        results_df['prediccion'] = preds.astype(int)
        results_df['probabilidad'] = probs.astype(float)
        results_df['riesgo'] = np.where(preds == 1, "Alto", "Bajo")
        
        return results_df.to_dict(orient="records")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando el archivo: {str(e)}")

# Configuración de URL de conexión a base de datos
# Asegúrate de configurar la variable de entorno DATABASE_URL en tu entorno (Render/Hostinger)
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

@app.get("/predict/db/")
async def predict_db():
    if model is None or encoders is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado.")
        
    try:
        # Abrimos la conexión y leemos todos los registros de la tabla 'estudiantes'
        with engine.connect() as conn:
            query = text("SELECT * FROM estudiantes")
            df = pd.read_sql(query, conn)
            
        if df.empty:
            raise HTTPException(status_code=404, detail="La tabla estudiantes está vacía.")
            
        required_cols = [
            'promedio_actual', 'tareas_no_entregadas', 'reprobaciones_previas', 
            'dias_desde_ultima_conexion', 'minutos_uso_semanal', 'dias_atraso_pagos', 
            'tipo_matricula_beca', 'nivel_socioeconomico', 'modalidad_matricula'
        ]
        
        # Verificar que la tabla tenga las columnas necesarias
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Faltan columnas requeridas en la BD: {missing_cols}")
        
        results_df = df.copy()
        
        # 1. Transformación de categorías vectorizada
        for col in ['tipo_matricula_beca', 'nivel_socioeconomico', 'modalidad_matricula']:
            if col in df.columns:
                valid_classes = encoders[col].classes_
                default_class = valid_classes[0]
                df[col] = np.where(df[col].isin(valid_classes), df[col], default_class)
                df[col] = encoders[col].transform(df[col])
                
        X = df[required_cols]
        
        # 2. Predicción masiva
        preds = model.predict(X)
        probs = model.predict_proba(X)[:, 1]
        
        # 3. Construcción de resultados vectorizada
        results_df['prediccion'] = preds.astype(int)
        results_df['probabilidad'] = probs.astype(float)
        results_df['riesgo'] = np.where(preds == 1, "Alto", "Bajo")
        
        # 4. Exportar el DataFrame a lista de diccionarios instantáneamente
        return results_df.to_dict(orient="records")
        
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Error conectando a BD o procesando: {str(e)}")
