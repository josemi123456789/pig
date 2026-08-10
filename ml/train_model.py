import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# Rutas absolutas basadas en la ubicación del script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
DATA_PATH = os.path.join(PROJECT_DIR, 'data', 'dataset_desercion_final.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'saved_models')

if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

def train():
    print("Cargando datos...")
    df = pd.read_csv(DATA_PATH)
    
    # Preprocesamiento
    categorical_cols = ['nivel_socioeconomico', 'modalidad_matricula']
    encoders = {}
    
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
        
    X = df.drop('desercion', axis=1)
    y = df['desercion']
    
    print("Entrenando modelo RandomForest...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Exportar
    print("Exportando modelo y codificadores...")
    joblib.dump(model, os.path.join(MODEL_DIR, 'rf_model.pkl'))
    joblib.dump(encoders, os.path.join(MODEL_DIR, 'encoders.pkl'))
    
    print("¡Entrenamiento y exportación finalizados con éxito!")

if __name__ == '__main__':
    train()
