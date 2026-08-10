from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    promedio_actual: float = Field(..., ge=0.0, le=10.0, description="Promedio de notas actual")
    tareas_no_entregadas: int = Field(..., ge=0, description="Tareas no entregadas")
    reprobaciones_previas: int = Field(..., ge=0, description="Reprobaciones previas")
    dias_desde_ultima_conexion: int = Field(..., ge=0, description="Días desde última conexión")
    minutos_uso_semanal: int = Field(..., ge=0, description="Minutos de uso semanal")
    dias_atraso_pagos: int = Field(..., ge=0, description="Días de atraso en pagos")
    tipo_matricula_beca: int = Field(..., description="0 para Sin Beca, 1 para Con Beca")
    nivel_socioeconomico: str = Field(..., description="Bajo, Medio, o Alto")
    modalidad_matricula: str = Field(..., description="Ordinaria o Extraordinaria")

class PredictResponse(BaseModel):
    prediccion: int = Field(..., description="0 = No Deserta, 1 = Deserta")
    probabilidad: float = Field(..., description="Probabilidad de deserción")
    riesgo: str = Field(..., description="Alto o Bajo riesgo")

class DBConnectRequest(BaseModel):
    type: str = Field(..., description="Tipo de BD (MySQL, PostgreSQL)")
    host: str = Field(..., description="Host")
    port: str = Field(..., description="Puerto")
    database: str = Field(..., description="Nombre Base de Datos")
    user: str = Field(..., description="Usuario")
    password: str = Field(..., description="Contraseña")
