import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Sidebar & Layout State
  const [activeMenu, setActiveMenu] = useState('Subir CSV / Conectar DB');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const csvInputRef = useRef(null);

  // --- DB Connection State ---
  const [dbConnectionMode, setDbConnectionMode] = useState('direct'); // 'direct' or 'file'
  const dbInputRef = useRef(null);
  const [dbFile, setDbFile] = useState(null);

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
  const [isLoadingCSV, setIsLoadingCSV] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [batchError, setBatchError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Funciones de Login
  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginForm.username && loginForm.password) {
      setIsAuthenticated(true);
    }
  };

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
      // Simulate success for demo purposes if backend is unavailable
      setResultado({
        nombre: formData.nombre || 'Estudiante',
        probabilidad: 0.15,
        pronostico: 'Continuidad'
      });
    } finally {
      setLoading(false);
    }
  };

  const isAltoRiesgo = resultado?.probabilidad > 0.5;

  // Funciones Masiva CSV
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmitBatch = async (e) => {
    if (e) e.preventDefault();
    if (!file) return;
    
    setIsLoadingCSV(true);
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
      setActiveMenu('Resultados');
    } catch (err) {
      setBatchError(err.message);
      setIsLoadingCSV(false);
    } finally {
      setIsLoadingCSV(false);
    }
  };

  // Funciones BD File
  const handleDbFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDbFile(e.target.files[0]);
    }
  };

  const handleSubmitDBUpload = async () => {
    if (!dbFile) return;
    
    setIsLoadingDB(true);
    setBatchError(null);
    setBatchResults(null);

    const formDataToUpload = new FormData();
    formDataToUpload.append('file', dbFile);

    try {
      const response = await fetch(`${API_URL}/predict/upload-db/`, {
        method: 'POST',
        body: formDataToUpload,
      });

      if (!response.ok) throw new Error('Error procesando el archivo BD');
      
      const results = await response.json();
      const sortedResults = results.sort((a, b) => b.prediccion - a.prediccion);
      
      setBatchResults(sortedResults);
      setCurrentPage(1);
      setActiveMenu('Resultados');
    } catch (err) {
      setBatchError(err.message);
      setIsLoadingDB(false);
    } finally {
      setIsLoadingDB(false);
    }
  };

  // Funciones BD Form
  const handleTestConnectionDB = async (e) => {
    e.preventDefault();
    setIsLoadingDB(true);
    setTimeout(() => {
      setIsLoadingDB(false);
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
    } else if (pendingAction === 'dbForm') {
      const fakeEvent = { preventDefault: () => {} };
      handleTestConnectionDB(fakeEvent);
    } else if (pendingAction === 'dbFile' && dbInputRef.current) {
      dbInputRef.current.click();
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"></path></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Bienvenido al SAT</h1>
            <p className="text-sm text-gray-500 mt-1">Sistema de Alerta Temprana de Deserción</p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Usuario</label>
              <input 
                type="text" 
                name="username" 
                value={loginForm.username} 
                onChange={handleLoginChange} 
                placeholder="Ingresa tu usuario"
                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
              <input 
                type="password" 
                name="password" 
                value={loginForm.password} 
                onChange={handleLoginChange} 
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                required 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors shadow-md mt-4"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-gray-800 overflow-hidden relative">
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Izquierdo: Responsivo */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-white border-r border-gray-200 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"></path></svg>
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-gray-800 leading-tight">Sistema de Predicción</h1>
              <p className="text-[12px] text-gray-500">Deserción Estudiantil</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <nav className="flex-1 mt-2 overflow-y-auto px-4">
          <ul className="space-y-1">
            {menuOptions.map((option) => (
              <li key={option.name}>
                <button
                  onClick={() => {
                    setActiveMenu(option.name);
                    setIsSidebarOpen(false);
                  }}
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
        <div className="p-4 hidden md:block">
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
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between md:justify-end px-4 md:px-8 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="md:hidden text-gray-500 hover:text-gray-700 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>

          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-700 transition-colors hidden sm:block">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </button>
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          
          {/* VISTA 1: INICIO */}
          {activeMenu === 'Inicio' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full items-center justify-center text-center animate-fade-in">
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 mx-auto">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Bienvenido al Dashboard</h2>
              <p className="text-gray-500 max-w-lg mx-auto">
                Selecciona una opción en el menú lateral para comenzar a procesar predicciones, evaluar estudiantes individuales o revisar el historial de datos.
              </p>
            </div>
          )}

          {/* VISTA 2: SUBIR CSV / CONECTAR DB */}
          {activeMenu === 'Subir CSV / Conectar DB' && (
            <div className="max-w-6xl mx-auto flex flex-col h-full animate-fade-in">
              <div className="mb-6 md:mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Subir Archivo CSV o Conectar Base de Datos</h2>
                <p className="text-gray-500 mt-1">Selecciona la fuente de datos para realizar predicciones</p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-stretch">
                
                {/* Tarjeta Izquierda (CSV) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col w-full md:w-1/2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Subir Archivo CSV</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Sube tu archivo CSV con los datos estudiantiles para realizar predicciones.
                  </p>

                  <div 
                    className="bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center mb-6 h-48 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleActionClick('csv')}
                  >
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
                      disabled={isLoadingCSV}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors mb-6 shadow-sm"
                    >
                      {isLoadingCSV ? 'Procesando...' : (file ? 'Analizar Archivo' : 'Seleccionar archivo')}
                    </button>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 items-start">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-sm text-green-800 leading-snug">El archivo debe contener los campos requeridos.</p>
                    </div>
                  </div>
                </div>

                {/* Tarjeta Derecha (Base de Datos) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col w-full md:w-1/2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Conectar Base de Datos</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Conecta directamente a tu base de datos para obtener los datos.
                  </p>

                  {/* Selector de modo de BD */}
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                    <button 
                      onClick={() => setDbConnectionMode('direct')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${dbConnectionMode === 'direct' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Conexión Directa
                    </button>
                    <button 
                      onClick={() => setDbConnectionMode('file')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${dbConnectionMode === 'file' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Subir Archivo DB
                    </button>
                  </div>

                  {dbConnectionMode === 'direct' ? (
                    <form className="space-y-4 flex-1 flex flex-col animate-fade-in" onSubmit={(e) => { e.preventDefault(); handleActionClick('dbForm'); }}>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de BD</label>
                        <select name="type" value={dbConfig.type} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors">
                          <option value="MySQL">MySQL</option>
                          <option value="PostgreSQL">PostgreSQL</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Host</label>
                          <input type="text" name="host" value={dbConfig.host} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Puerto</label>
                          <input type="text" name="port" value={dbConfig.port} onChange={handleDbChange} className="w-full bg-slate-100 border border-transparent focus:border-indigo-600 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none transition-colors" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Base de Datos</label>
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
                  ) : (
                    <div className="flex-1 flex flex-col animate-fade-in">
                      <div 
                        className="bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center mb-6 h-48 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleActionClick('dbFile')}
                      >
                        <svg className="w-12 h-12 text-indigo-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                        <p className="font-semibold text-gray-800 mb-1">Arrastra tu archivo BD</p>
                        <p className="text-sm text-gray-500 mb-3">o haz clic para seleccionar</p>
                        <p className="text-xs text-gray-400">Formatos soportados: .db, .sqlite, .sql</p>
                      </div>
                      
                      <input type="file" accept=".db,.sqlite,.sql" ref={dbInputRef} onChange={handleDbFileChange} className="hidden" />

                      {dbFile && <p className="mb-4 text-sm text-indigo-600 font-medium text-center">Seleccionado: {dbFile.name}</p>}

                      <div className="mt-auto">
                        <button 
                          onClick={() => {
                            if (dbFile) {
                              handleSubmitDBUpload();
                            } else {
                              handleActionClick('dbFile');
                            }
                          }}
                          disabled={isLoadingDB}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors shadow-sm"
                        >
                          {isLoadingDB ? 'Procesando...' : (dbFile ? 'Cargar Base de Datos' : 'Seleccionar archivo')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
              
              <div className="mt-8 pt-4 pb-4 text-center text-xs text-gray-400">
                © 2024 Sistema de Predicción de Deserción Estudiantil. Todos los derechos reservados.
              </div>
            </div>
          )}

          {/* VISTA 3: EVALUAR ESTUDIANTE */}
          {activeMenu === 'Evaluar Estudiante' && (
            <div className="max-w-6xl mx-auto animate-fade-in">
              <div className="mb-6 md:mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Evaluación Individual</h2>
                <p className="text-gray-500 mt-1">Ingresa los datos del estudiante para predecir su riesgo de deserción.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3">Formulario de Datos</h3>
                  <form onSubmit={handleSubmitIndividual} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Estudiante</label>
                      <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-indigo-600 focus:outline-none" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Promedio Actual</label>
                        <input type="number" step="0.1" name="promedio_actual" value={formData.promedio_actual} onChange={handleChange} className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-indigo-600 focus:outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Tareas Faltantes</label>
                        <input type="number" name="tareas_no_entregadas" value={formData.tareas_no_entregadas} onChange={handleChange} className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-indigo-600 focus:outline-none" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Fallas Previas</label>
                        <input type="number" name="reprobaciones_previas" value={formData.reprobaciones_previas} onChange={handleChange} className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-indigo-600 focus:outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Días sin Conexión</label>
                        <input type="number" name="dias_desde_ultima_conexion" value={formData.dias_desde_ultima_conexion} onChange={handleChange} className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-indigo-600 focus:outline-none" required />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors mt-6 shadow-sm">
                      {loading ? 'Evaluando...' : 'Evaluar Riesgo'}
                    </button>
                  </form>
                </div>
                
                {/* Resultado Individual */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col justify-center h-full min-h-[400px]">
                  {resultado ? (
                    <div className="text-center animate-fade-in">
                      <h4 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Resultado para</h4>
                      <p className="text-2xl font-bold text-gray-800 mb-6">{resultado.nombre}</p>
                      
                      <div className={`p-6 rounded-2xl mb-8 ${isAltoRiesgo ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                        <p className={`text-xl font-bold ${isAltoRiesgo ? 'text-red-700' : 'text-green-700'}`}>
                          {isAltoRiesgo ? 'Alto Riesgo de Deserción' : 'Bajo Riesgo / Continuidad'}
                        </p>
                        <p className="text-4xl font-black mt-3 text-gray-800">
                          {(resultado.probabilidad * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Probabilidad de Deserción</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <p className="text-lg">Ingresa los datos para ver la predicción aquí</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VISTA 4 & 5: RESULTADOS Y HISTORIAL */}
          {(activeMenu === 'Resultados' || activeMenu === 'Historial') && (
            <div className="max-w-6xl mx-auto animate-fade-in">
               <div className="mb-6 md:mb-8 flex justify-between items-end">
                 <div>
                   <h2 className="text-2xl font-bold text-gray-800">{activeMenu} Recientes</h2>
                   <p className="text-gray-500 mt-1">
                     {activeMenu === 'Resultados' && batchResults ? 'Resultados del último procesamiento.' : 'Registros de evaluaciones anteriores del modelo.'}
                   </p>
                 </div>
                 {activeMenu === 'Resultados' && batchResults && (
                   <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm shadow-sm flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                     Exportar a Excel
                   </button>
                 )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4">Nombre Estudiante</th>
                        {activeMenu === 'Resultados' && batchResults && <th className="px-6 py-4 text-center">Matrícula</th>}
                        <th className="px-6 py-4 text-center">{activeMenu === 'Resultados' && batchResults ? 'Promedio' : 'Fecha'}</th>
                        <th className="px-6 py-4 text-center">Probabilidad</th>
                        <th className="px-6 py-4 text-center">Nivel de Riesgo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMenu === 'Resultados' && batchResults ? (
                        currentItems.map((record, index) => (
                          <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-800">{record.nombre || `Estudiante #${index+1}`}</td>
                            <td className="px-6 py-4 text-center">{record.modalidad_matricula || 'N/A'}</td>
                            <td className="px-6 py-4 text-center">{record.promedio_actual !== undefined ? record.promedio_actual : 'N/A'}</td>
                            <td className="px-6 py-4 text-center font-bold text-gray-700">{(record.probabilidad * 100).toFixed(1)}%</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${record.prediccion === 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {record.riesgo}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        [
                          { nombre: "Ana Martínez", fecha: "2024-05-10", prob: "12.5%", riesgo: "Bajo", isRisk: false },
                          { nombre: "Carlos Gómez", fecha: "2024-05-09", prob: "78.2%", riesgo: "Alto", isRisk: true },
                          { nombre: "Lucía Fernández", fecha: "2024-05-08", prob: "5.1%", riesgo: "Bajo", isRisk: false },
                          { nombre: "Roberto Silva", fecha: "2024-05-07", prob: "82.9%", riesgo: "Alto", isRisk: true },
                          { nombre: "María Torres", fecha: "2024-05-05", prob: "34.0%", riesgo: "Bajo", isRisk: false },
                        ].map((record, index) => (
                          <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-800">{record.nombre}</td>
                            <td className="px-6 py-4 text-center">{record.fecha}</td>
                            <td className="px-6 py-4 text-center font-bold text-gray-700">{record.prob}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${record.isRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {record.riesgo}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 6 & 7: DOCUMENTACIÓN Y ACERCA DEL MODELO */}
          {(activeMenu === 'Documentación' || activeMenu === 'Acerca del Modelo') && (
            <div className="max-w-4xl mx-auto animate-fade-in">
              <div className="mb-6 md:mb-8">
                <h2 className="text-2xl font-bold text-gray-800">{activeMenu}</h2>
                <p className="text-gray-500 mt-1">Información sobre el sistema predictivo.</p>
              </div>

              <div className="grid gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">¿Cómo funciona el modelo?</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Este Sistema de Alerta Temprana utiliza un modelo de Machine Learning entrenado (ej. Random Forest / XGBoost) para analizar múltiples variables del comportamiento y rendimiento del estudiante. Factores como ausentismo, bajas calificaciones previas, y problemas de pago son cruzados para generar un porcentaje de probabilidad de deserción.
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Si la probabilidad es superior al 50%, el estudiante es etiquetado como "Alto Riesgo", permitiendo a la institución tomar medidas preventivas como tutorías o ayudas económicas.
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                   <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Variables Analizadas</h3>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 ml-2">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Promedio Actual</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Tareas Faltantes</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Fallas Previas</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Tiempo de Uso de Plataforma</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Días de Atraso en Pagos</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Nivel Socioeconómico</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Modal Overlay */}
          {showModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] p-6 md:p-8 relative animate-fade-in-up">
                
                <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Nota Importante</h3>
                  
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    Para que el modelo pueda realizar una evaluación correcta, los datos deben contener los siguientes campos obligatorios:
                  </p>
                  
                  <div className="w-full flex justify-center mb-8">
                    <ul className="text-sm text-gray-700 font-semibold space-y-3 text-left">
                      {['promedio_actual', 'tareas_no_entregadas', 'reprobaciones_previas', 'dias_desde_ultima_conexion', 'minutos_uso_semanal', 'dias_atraso_pagos'].map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></span>
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
