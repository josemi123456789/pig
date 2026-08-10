import React from 'react';

const Dashboard = ({ resultado }) => {
    if (!resultado) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center min-h-[300px]">
                <p className="text-gray-500">Ingresa los datos para ver la predicción.</p>
            </div>
        );
    }

    const isAltoRiesgo = resultado.riesgo === "Alto";
    const alertColor = isAltoRiesgo ? "bg-red-100 border-red-500 text-red-700" : "bg-green-100 border-green-500 text-green-700";

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-1 text-gray-700">Resultado de Análisis</h2>
            {resultado.nombre && (
                <p className="text-lg font-medium text-blue-800 mb-4">Estudiante: {resultado.nombre}</p>
            )}
            
            <div className={`border-l-4 p-4 rounded mb-6 ${alertColor}`}>
                <h3 className="font-bold text-lg mb-1">
                    {isAltoRiesgo ? "¡ALERTA! Alto Riesgo de Deserción" : "Bajo Riesgo de Deserción"}
                </h3>
                <p>El modelo indica un nivel de riesgo <strong>{resultado.riesgo}</strong>.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded border">
                    <p className="text-sm text-gray-500 mb-1">Predicción Bruta</p>
                    <p className="text-2xl font-bold">{resultado.prediccion === 1 ? 'Positivo' : 'Negativo'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded border">
                    <p className="text-sm text-gray-500 mb-1">Probabilidad</p>
                    <p className="text-2xl font-bold">{(resultado.probabilidad * 100).toFixed(1)}%</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
