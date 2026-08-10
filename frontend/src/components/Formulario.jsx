import React, { useState } from 'react';
import { predecirDesercion } from '../services/api';

const Formulario = ({ setResultado }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        promedio_actual: '',
        tareas_no_entregadas: '',
        reprobaciones_previas: '',
        dias_desde_ultima_conexion: '',
        minutos_uso_semanal: '',
        dias_atraso_pagos: '',
        tipo_matricula_beca: '0',
        nivel_socioeconomico: 'Medio',
        modalidad_matricula: 'Ordinaria'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Validación en tiempo real
        if (name === 'promedio_actual') {
            if (value === '') { setFormData({ ...formData, [name]: '' }); return; }
            const num = parseFloat(value);
            if (num > 10) return;
            if (num < 0) return;
        }
        if (['tareas_no_entregadas', 'reprobaciones_previas', 'dias_desde_ultima_conexion', 'minutos_uso_semanal', 'dias_atraso_pagos'].includes(name)) {
            if (value === '') { setFormData({ ...formData, [name]: '' }); return; }
            const num = parseInt(value);
            if (num < 0) return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await predecirDesercion(formData);
            setResultado({ ...result, nombre: formData.nombre });
        } catch (err) {
            setError('Error al procesar la predicción. Revisa la conexión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Datos del Estudiante</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600">Nombre del Estudiante</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Juan Pérez" className="mt-1 w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Promedio Actual (0.0 - 10.0)</label>
                    <input type="number" step="0.1" min="0" max="10" name="promedio_actual" value={formData.promedio_actual} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Tareas no entregadas</label>
                    <input type="number" min="0" name="tareas_no_entregadas" value={formData.tareas_no_entregadas} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Reprobaciones previas</label>
                    <input type="number" min="0" name="reprobaciones_previas" value={formData.reprobaciones_previas} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Días desde última conexión</label>
                    <input type="number" min="0" name="dias_desde_ultima_conexion" value={formData.dias_desde_ultima_conexion} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Minutos de uso semanal</label>
                    <input type="number" min="0" name="minutos_uso_semanal" value={formData.minutos_uso_semanal} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Días de atraso en pagos</label>
                    <input type="number" min="0" name="dias_atraso_pagos" value={formData.dias_atraso_pagos} onChange={handleChange} required className="mt-1 w-full border border-gray-300 rounded-md p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Tipo de Matrícula (Beca)</label>
                    <select name="tipo_matricula_beca" value={formData.tipo_matricula_beca} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                        <option value="0">Sin Beca (0)</option>
                        <option value="1">Con Beca (1)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Nivel Socioeconómico</label>
                    <select name="nivel_socioeconomico" value={formData.nivel_socioeconomico} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600">Modalidad de Matrícula</label>
                    <select name="modalidad_matricula" value={formData.modalidad_matricula} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                        <option value="Ordinaria">Ordinaria</option>
                        <option value="Extraordinaria">Extraordinaria</option>
                    </select>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition">
                    {loading ? 'Calculando...' : 'Predecir Riesgo'}
                </button>
            </form>
        </div>
    );
};

export default Formulario;
