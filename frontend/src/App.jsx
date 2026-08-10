import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('individual');

  // --- Estado para Evaluación Individual ---
  const [formData, setFormData] = useState({
    nombre: '', 
    promedio_actual: '',
    tareas_no_entregadas: '',
    reprobaciones_previas: '',
    dias_desde_ultima_conexion: '',
    minutos_uso_semanal: '',
    dias_atraso_pagos: '',
    tipo_matricula_beca: '0',
    nivel_socioeconomico: 'Bajo',
    modalidad_matricula: 'Ordinaria',
  });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // --- Estado para Evaluación Masiva ---
  const [file, setFile] = useState(null);
  const [dbFile, setDbFile] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchError, setBatchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Funciones Individual
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitIndividual = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { nombre, ...dataToSend } = formData;
    
    try {
      const response = await fetch(`${API_URL}/predict/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promedio_actual: parseFloat(dataToSend.promedio_actual),
          tareas_no_entregadas: parseInt(dataToSend.tareas_no_entregadas),
          reprobaciones_previas: parseInt(dataToSend.reprobaciones_previas),
          dias_desde_ultima_conexion: parseInt(dataToSend.dias_desde_ultima_conexion),
          minutos_uso_semanal: parseInt(dataToSend.minutos_uso_semanal),
          dias_atraso_pagos: parseInt(dataToSend.dias_atraso_pagos),
          tipo_matricula_beca: parseInt(dataToSend.tipo_matricula_beca),
          nivel_socioeconomico: dataToSend.nivel_socioeconomico,
          modalidad_matricula: dataToSend.modalidad_matricula,
        }),
      });
      
      if (!response.ok) throw new Error('Error en la respuesta del servidor');
      
      const result = await response.json();
      
      setResultado({ 
        nombre, 
        probabilidad: result.probabilidad, 
        pronostico: result.prediccion === 1 ? 'Deserción' : 'Continuidad' 
      });

    } catch (error) {
      console.error('Error al realizar la predicción:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAltoRiesgo = resultado?.probabilidad > 0.5;

  // Funciones Masiva
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    setBatchLoading(true);
    setBatchError(null);
    setBatchResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/predict/batch/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error procesando el archivo CSV');
      
      const results = await response.json();
      
      // Ordenar: Alto riesgo primero (prediccion == 1)
      const sortedResults = results.sort((a, b) => b.prediccion - a.prediccion);
      
      setBatchResults(sortedResults);
      setCurrentPage(1);
    } catch (err) {
      setBatchError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDbFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDbFile(e.target.files[0]);
    }
  };

  const handleSubmitDB = async (e) => {
    e.preventDefault();
    if (!dbFile) return;

    setBatchLoading(true);
    setBatchError(null);
    setBatchResults(null);

    const formData = new FormData();
    formData.append('file', dbFile);

    try {
      const response = await fetch(`${API_URL}/predict/upload-db/`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Error conectando con la Base de Datos o archivo inválido');
      const results = await response.json();
      const sortedResults = results.sort((a, b) => b.prediccion - a.prediccion);
      setBatchResults(sortedResults);
      setCurrentPage(1);
    } catch (err) {
      setBatchError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Cálculos KPIs Masivos
  const totalEvaluados = batchResults ? batchResults.length : 0;
  const enRiesgo = batchResults ? batchResults.filter(r => r.prediccion === 1).length : 0;
  const tasaDesercion = totalEvaluados > 0 ? ((enRiesgo / totalEvaluados) * 100).toFixed(1) : 0;

  // Lógica de Paginación
  const ITEMS_PER_PAGE = 50;
  const totalPages = batchResults ? Math.ceil(batchResults.length / ITEMS_PER_PAGE) : 0;
  const currentItems = batchResults ? batchResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) : [];

  const exportToExcel = () => {
    if (!batchResults || batchResults.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(batchResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    XLSX.writeFile(wb, "resultados_prediccion.xlsx");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-slate-800 mb-8 tracking-tight">
          Sistema de Alerta Temprana
        </h1>

        {/* --- NAVEGACIÓN --- */}
        <div className="flex justify-center space-x-4 mb-8">
          <button 
            onClick={() => setActiveTab('individual')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'individual' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Evaluación Individual
          </button>
          <button 
            onClick={() => setActiveTab('masiva')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'masiva' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Evaluación Masiva (CSV)
          </button>
        </div>

        {/* --- VISTA INDIVIDUAL --- */}
        {activeTab === 'individual' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold mb-6 text-slate-700 border-b border-slate-100 pb-3">Datos del Estudiante</h2>
              <form onSubmit={handleSubmitIndividual} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Nombre del Estudiante</label>
                  <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Promedio Actual</label>
                    <input type="number" step="0.1" name="promedio_actual" value={formData.promedio_actual} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Tareas No Entregadas</label>
                    <input type="number" name="tareas_no_entregadas" value={formData.tareas_no_entregadas} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Reprobaciones Previas</label>
                    <input type="number" name="reprobaciones_previas" value={formData.reprobaciones_previas} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Días Última Conexión</label>
                    <input type="number" name="dias_desde_ultima_conexion" value={formData.dias_desde_ultima_conexion} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Minutos Uso Semanal</label>
                    <input type="number" name="minutos_uso_semanal" value={formData.minutos_uso_semanal} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Días Atraso Pagos</label>
                    <input type="number" name="dias_atraso_pagos" value={formData.dias_atraso_pagos} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Tipo Matrícula / Beca</label>
                  <select name="tipo_matricula_beca" value={formData.tipo_matricula_beca} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all">
                    <option value="0">Sin Beca</option>
                    <option value="1">Con Beca</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Nivel Socioeconómico</label>
                    <select name="nivel_socioeconomico" value={formData.nivel_socioeconomico} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all">
                      <option value="Bajo">Bajo</option>
                      <option value="Medio">Medio</option>
                      <option value="Alto">Alto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Modalidad Matrícula</label>
                    <select name="modalidad_matricula" value={formData.modalidad_matricula} onChange={handleChange} className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all">
                      <option value="Ordinaria">Ordinaria</option>
                      <option value="Extraordinaria">Extraordinaria</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors flex justify-center shadow-md disabled:bg-blue-400">
                  {loading ? 'Calculando...' : 'Predecir Riesgo'}
                </button>
              </form>
            </div>
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full min-h-[500px]">
              <h2 className="text-xl font-semibold mb-6 text-slate-700 border-b border-slate-100 pb-3">Resultado de Análisis</h2>
              {!resultado ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <p className="text-lg">Completa el formulario para ver la predicción</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col animate-fade-in">
                  <div className="mb-8">
                    <p className="text-sm text-slate-500 uppercase font-semibold mb-1">Evaluación para</p>
                    <p className="text-3xl font-bold text-slate-800">{resultado.nombre}</p>
                  </div>
                  <div className={`p-8 rounded-2xl mb-10 flex-1 flex flex-col justify-center items-center text-center transition-all ${isAltoRiesgo ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                    <h3 className={`text-3xl font-bold mb-3 ${isAltoRiesgo ? 'text-red-700' : 'text-green-700'}`}>
                      {isAltoRiesgo ? '¡ALERTA! Alto Riesgo de Deserción' : 'Riesgo Bajo/Normal'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-center text-center">
                      <span className="text-sm text-slate-500 font-medium uppercase mb-1">Pronóstico</span>
                      <span className="text-2xl font-bold text-slate-800">{resultado.pronostico}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-center text-center">
                      <span className="text-sm text-slate-500 font-medium uppercase mb-1">Probabilidad</span>
                      <span className={`text-3xl font-black ${isAltoRiesgo ? 'text-red-600' : 'text-green-600'}`}>
                        {(resultado.probabilidad * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- VISTA MASIVA --- */}
        {activeTab === 'masiva' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Zona de Subida */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
              <h2 className="text-xl font-semibold mb-4 text-slate-700">Cargar Archivo de Estudiantes (CSV)</h2>
              <form onSubmit={handleSubmitBatch} className="flex flex-col items-center">
                <label className="flex flex-col items-center justify-center w-full max-w-lg h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Haz clic para seleccionar</span> o arrastra un archivo</p>
                    <p className="text-xs text-slate-500">Solo archivos CSV</p>
                  </div>
                  <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </label>
                {file && <p className="mt-3 text-sm text-blue-600 font-medium">Archivo seleccionado: {file.name}</p>}
                
                <button type="submit" disabled={!file || batchLoading} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-8 rounded-lg transition-colors shadow-md disabled:bg-blue-400">
                  {batchLoading ? 'Procesando...' : 'Analizar Estudiantes'}
                </button>
              </form>
              {batchError && <p className="mt-4 text-red-500 text-sm">{batchError}</p>}
              
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h2 className="text-xl font-semibold mb-4 text-slate-700">O Cargar Archivo SQLite (.db)</h2>
                <form onSubmit={handleSubmitDB} className="flex flex-col items-center">
                  <label className="flex flex-col items-center justify-center w-full max-w-lg h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                      <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Haz clic para seleccionar</span> o arrastra un archivo</p>
                      <p className="text-xs text-slate-500">Solo archivos SQLite (.db)</p>
                    </div>
                    <input type="file" accept=".db,.sqlite" onChange={handleDbFileChange} className="hidden" />
                  </label>
                  {dbFile && <p className="mt-3 text-sm text-indigo-600 font-medium">Archivo seleccionado: {dbFile.name}</p>}
                  
                  <button type="submit" disabled={!dbFile || batchLoading} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-8 rounded-lg transition-colors shadow-md disabled:bg-indigo-400 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                    {batchLoading ? 'Procesando...' : 'Evaluar desde Base de Datos'}
                  </button>
                </form>
              </div>
            </div>

            {/* KPIs */}
            {batchResults && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center">
                    <span className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Total Evaluados</span>
                    <span className="text-4xl font-bold text-slate-800 mt-2">{totalEvaluados}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center">
                    <span className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Estudiantes en Riesgo</span>
                    <span className="text-4xl font-bold text-red-600 mt-2">{enRiesgo}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center">
                    <span className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Tasa Deserción Proyectada</span>
                    <span className="text-4xl font-bold text-orange-500 mt-2">{tasaDesercion}%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4 mt-2">
                  <h3 className="text-xl font-semibold text-slate-700">Detalle de Estudiantes</h3>
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Exportar a Excel
                  </button>
                </div>

                {/* Tabla de Resultados */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Promedio</th>
                          <th className="px-6 py-4">Tareas Faltantes</th>
                          <th className="px-6 py-4">Fallas Previas</th>
                          <th className="px-6 py-4">Días Conexión</th>
                          <th className="px-6 py-4 text-center">Probabilidad</th>
                          <th className="px-6 py-4 text-center">Riesgo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((estudiante, index) => {
                          const isRisk = estudiante.prediccion === 1;
                          return (
                            <tr key={index} className={`border-b last:border-b-0 hover:bg-slate-50 transition-colors ${isRisk ? 'bg-red-50/40' : ''}`}>
                              <td className="px-6 py-4 font-medium">{estudiante.promedio_actual}</td>
                              <td className="px-6 py-4">{estudiante.tareas_no_entregadas}</td>
                              <td className="px-6 py-4">{estudiante.reprobaciones_previas}</td>
                              <td className="px-6 py-4">{estudiante.dias_desde_ultima_conexion}</td>
                              <td className="px-6 py-4 text-center font-semibold">
                                {(estudiante.probabilidad * 100).toFixed(1)}%
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${isRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {estudiante.riesgo}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Controles de Paginación */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium"
                    >
                      Anterior
                    </button>
                    <span className="text-sm font-medium text-slate-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
