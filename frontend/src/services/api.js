export const predecirDesercion = async (datos) => {
    try {
        const response = await fetch('http://localhost:8000/predict/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                promedio_actual: parseFloat(datos.promedio_actual),
                tareas_no_entregadas: parseInt(datos.tareas_no_entregadas),
                reprobaciones_previas: parseInt(datos.reprobaciones_previas),
                dias_desde_ultima_conexion: parseInt(datos.dias_desde_ultima_conexion),
                minutos_uso_semanal: parseInt(datos.minutos_uso_semanal),
                dias_atraso_pagos: parseInt(datos.dias_atraso_pagos),
                tipo_matricula_beca: parseInt(datos.tipo_matricula_beca),
                nivel_socioeconomico: datos.nivel_socioeconomico,
                modalidad_matricula: datos.modalidad_matricula
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error al conectar con la API:", error);
        throw error;
    }
};
