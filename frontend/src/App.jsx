import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function App() {
  // Sidebar state
  const [activeMenu, setActiveMenu] = useState('Subir CSV / Conectar DB');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const csvInputRef = useRef(null);

  // --- DB Connection State ---
  const [dbConfig, setDbConfig] = useState({
    type: 'MySQL',
    host: 'localhost',
    port: '3306',
    database: 'mi_base_datos',
    user: 'usuario',
    password: ''
  });

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

  const handleDbChange = (e) => {
    const { name, value } = e.target;
    setDbConfig(prev => ({ ...prev, [name]: value }));
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
    if (e) e.preventDefault();
    if (!file) return;
    
    setBatchLoading(true);
    setBatchError(null);
    setBatchResults(null);

    const formDataToUpload = new FormData();
    formDataToUpload.append('file', file);

    try {
      const response = await fetch(`${API_URL}/predict/batch/`, {
        method: 'POST',
        body: formDataToUpload,
      });

      if (!response.ok) throw new Error('Error procesando el archivo CSV');
      
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

  const handleTestConnectionDB = async (e) => {
    e.preventDefault();
    setBatchLoading(true);
    setTimeout(() => {
      setBatchLoading(false);
      alert('Funcionalidad de conexión a BD simulada por el momento.');
    }, 1500);
  };

  // Modal logic
  const handleActionClick = (actionType) => {
    setPendingAction(actionType);
    setShowModal(true);
  };

  const handleModalConfirm = () => {
    setShowModal(false);
    if (pendingAction === 'csv' && csvInputRef.current) {
      csvInputRef.current.click();
    } else if (pendingAction === 'db') {
      const fakeEvent = { preventDefault: () => {} };
      handleTestConnectionDB(fakeEvent);
    }
    setPendingAction(null);
  };

  // Cálculos KPIs Masivos
  const totalEvaluados = batchResults ? batchResults.length : 0;
  const enRiesgo = batchResults ? batchResults.filter(r => r.prediccion === 1).length : 0;
  const tasaDesercion = totalEvaluados > 0 ? ((enRiesgo / totalEvaluados) * 100).toFixed(1) : 0;

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

  const menuOptions = [
    { name: 'Inicio', icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> },
    { name: 'Subir CSV / Conectar DB', icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg> },
    { name: 'Evaluar Estudiante', icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> },
    { name: 'Resultados', icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg> },
    { name: 'Historial', icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
    { name: 'Documentación', icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg> },
    { name: 'Acerca del Modelo', icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-gray-800 overflow-hidden">
      
      {/* Sidebar Izquierdo: Fondo blanco */}
      <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col z-10 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"></path></svg>
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-gray-800 leading-tight">Sistema de Predicción</h1>
            <p className="text-[12px] text-gray-500">Deserción Estudiantil</p>
          </div>
        </div>
        
        <nav className="flex-1 mt-2 overflow-y-auto px-4">
          <ul className="space-y-1">
            {menuOptions.map((option) => (
              <li key={option.name}>
                <button
                  onClick={() => setActiveMenu(option.name)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                    activeMenu === option.name
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {option.icon}
                  {option.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Tarjeta inferior: Modelo Activo */}
        <div className="p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3z"></path></svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-600">Modelo Activo</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs text-gray-600">v1.0.0</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Última actualización: <br/> 08/05/2024 14:30
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50">
        
        {/* Barra Superior */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-end px-8 shrink-0">
          <div className="flex items-center gap-4">
            {/* Ícono de tema (sol) */}
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </button>
            {/* Perfil de usuario */}
            <div className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 rounded-full pl-1 pr-3 py-1 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                A
              </div>
              <span className="text-sm font-medium text-gray-700">Admin</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {activeMenu === 'Subir CSV / Conectar DB' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Subir Archivo CSV o Conectar Base de Datos</h2>
                <p className="text-gray-500 mt-1">Selecciona la fuente de datos para realizar predicciones</p>
              </div>
              
              {/* Dos tarjetas blancas grandes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                
                {/* Tarjeta Izquierda (CSV) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Subir Archivo CSV</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Sube tu archivo CSV con los datos estudiantiles para realizar predicciones.
                  </p>

                  <div className="bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center mb-6 h-48">
                    <svg className="w-12 h-12 text-indigo-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="font-semibold text-gray-800 mb-1">Arrastra tu archivo</p>
                    <p className="text-sm text-gray-500 mb-3">o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-400">Formatos soportados: .csv</p>
                  </div>
                  
                  <input type="file" accept=".csv" ref={csvInputRef} onChange={handleFileChange} className="hidden" />

                  {file && <p className="mb-4 text-sm text-indigo-600 font-medium text-center">Seleccionado: {file.name}</p>}

                  <div className="mt-auto">
                    <button 
                      onClick={() => {
                        if (file) {
                          handleSubmitBatch();
                        } else {
                          handleActionClick('csv');
                        }
                      }}
                      disabled={batchLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors mb-6 shadow-sm"
                    >
                      {batchLoading ? 'Procesando...' : (file ? 'Analizar Archivo' : 'Seleccionar archivo')}
                    </button>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 items-start">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-sm text-green-800 leading-snug">El archivo debe contener los campos requeridos para la evaluación.</p>
                    </div>
                  </div>
                </div>

                {/* Tarjeta Derecha (Base de Datos) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Conectar Base de Datos</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Conecta directamente a tu base de datos para obtener los datos.
                  </p>

                  <form className="space-y-4 flex-1 flex flex-col" onSubmit={(e) => { e.preventDefault(); handleActionClick('db'); }}>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Base de Datos</label>
                      <select name="type" value={dbConfig.type} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors">
                        <option value="MySQL">MySQL</option>
                        <option value="PostgreSQL">PostgreSQL</option>
                        <option value="SQLite">SQLite</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Host</label>
                      <input type="text" name="host" value={dbConfig.host} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Puerto</label>
                      <input type="text" name="port" value={dbConfig.port} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Base de Datos</label>
                      <input type="text" name="database" value={dbConfig.database} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Usuario</label>
                      <input type="text" name="user" value={dbConfig.user} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors" />
                    </div>

                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Contraseña</label>
                      <input type="password" name="password" value={dbConfig.password} onChange={handleDbChange} placeholder="••••••••" className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors" />
                    </div>

                    <div className="mt-auto">
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors shadow-sm">
                        Probar Conexión
                      </button>
                    </div>
                  </form>
                </div>

              </div>
              
              <div className="mt-auto pt-8 pb-4 text-center text-xs text-gray-400">
                © 2024 Sistema de Predicción de Deserción Estudiantil. Todos los derechos reservados.
              </div>

              {batchResults && (
                <div className="mt-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                   {/* Table code omitted for brevity in thought process, but included in the file */}
                   <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Resultados del Análisis Masivo</h3>
                    <button 
                      onClick={exportToExcel}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm"
                    >
                      Exportar a Excel
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-50 p-6 rounded-xl border border-gray-200 text-center">
                      <span className="text-gray-500 text-xs font-semibold uppercase">Total Evaluados</span>
                      <span className="block text-3xl font-bold text-gray-800 mt-2">{totalEvaluados}</span>
                    </div>
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center">
                      <span className="text-gray-500 text-xs font-semibold uppercase">En Riesgo</span>
                      <span className="block text-3xl font-bold text-red-600 mt-2">{enRiesgo}</span>
                    </div>
                    <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center">
                      <span className="text-gray-500 text-xs font-semibold uppercase">Tasa Deserción</span>
                      <span className="block text-3xl font-bold text-orange-500 mt-2">{tasaDesercion}%</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4">Promedio</th>
                          <th className="px-6 py-4">Tareas Faltantes</th>
                          <th className="px-6 py-4">Fallas Previas</th>
                          <th className="px-6 py-4 text-center">Probabilidad</th>
                          <th className="px-6 py-4 text-center">Riesgo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((estudiante, index) => {
                          const isRisk = estudiante.prediccion === 1;
                          return (
                            <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-800">{estudiante.promedio_actual}</td>
                              <td className="px-6 py-4">{estudiante.tareas_no_entregadas}</td>
                              <td className="px-6 py-4">{estudiante.reprobaciones_previas}</td>
                              <td className="px-6 py-4 text-center font-bold text-gray-800">
                                {(estudiante.probabilidad * 100).toFixed(1)}%
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${isRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {estudiante.riesgo || (isRisk ? 'Alto' : 'Bajo')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeMenu !== 'Subir CSV / Conectar DB' && (
            <div className="max-w-6xl mx-auto flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <p className="text-xl font-medium">Contenido de {activeMenu}</p>
                <p className="text-sm mt-2">En desarrollo</p>
              </div>
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-[450px] p-8 relative animate-fade-in-up">
                
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Nota Importante</h3>
                  
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    Para que el modelo pueda realizar una evaluación correcta, el archivo CSV o la tabla de la base de datos debe contener los siguientes campos obligatorios:
                  </p>
                  
                  {/* Lista alineada al centro */}
                  <div className="w-full flex justify-center mb-8">
                    <ul className="text-sm text-gray-700 font-semibold space-y-3 text-left">
                      {['promedio_actual', 'tareas_no_entregadas', 'reprobaciones_previas', 'dias_desde_ultima_conexion', 'minutos_uso_semanal', 'dias_atraso_pagos', 'tipo_matricula_beca', 'nivel_socioeconomico', 'modalidad_matricula'].map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button 
                    onClick={handleModalConfirm}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors shadow-sm"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}
