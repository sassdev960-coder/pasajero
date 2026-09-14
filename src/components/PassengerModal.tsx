import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Settings, 
  LogOut, 
  Route as RouteIcon, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { SupabasePassenger, SupabaseRide, RideRequest } from '../types';
import { 
  getCurrentPassenger, 
  setCurrentPassenger, 
  loginPassenger, 
  registerPassenger, 
  updatePassengerProfile, 
  getPassengerRidesHistory, 
  getPassengerStats 
} from '../services/supabaseClient';

interface PassengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPassenger: SupabasePassenger | null;
  onPassengerChanged: (passenger: SupabasePassenger | null) => void;
  onRepeatRide?: (ride: RideRequest) => void;
  localHistory?: RideRequest[];
}

export const PassengerModal: React.FC<PassengerModalProps> = ({
  isOpen,
  onClose,
  currentPassenger,
  onPassengerChanged,
  onRepeatRide,
  localHistory = []
}) => {
  // Auth view mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  // Profile tab mode: 'profile' | 'history'
  const [profileTab, setProfileTab] = useState<'profile' | 'history'>('profile');

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ci, setCi] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stats & Passenger Rides
  const [stats, setStats] = useState<{ totalRides: number; completedRides: number; totalKm: number; totalSpent: number }>({
    totalRides: 0,
    completedRides: 0,
    totalKm: 0,
    totalSpent: 0
  });
  const [ridesHistory, setRidesHistory] = useState<SupabaseRide[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Sync inputs when currentPassenger changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (currentPassenger) {
        setFullName(currentPassenger.full_name || '');
        setPhone(currentPassenger.phone || '');
        setCi(currentPassenger.ci || '');
        loadPassengerData(currentPassenger.id);
      } else {
        setFullName('');
        setPhone('+591 ');
        setCi('');
      }
    }
  }, [isOpen, currentPassenger]);

  const loadPassengerData = async (passengerId: string) => {
    setIsLoadingHistory(true);
    try {
      const [fetchedStats, fetchedHistory] = await Promise.all([
        getPassengerStats(passengerId),
        getPassengerRidesHistory(passengerId)
      ]);

      // Calculate total km from Supabase rides + any local rides fallback
      let combinedKm = fetchedStats.totalKm;
      let combinedRides = fetchedStats.totalRides;
      let combinedSpent = fetchedStats.totalSpent;

      if (combinedRides === 0 && localHistory.length > 0) {
        combinedRides = localHistory.length;
        combinedKm = Math.round(localHistory.reduce((acc, r) => acc + (r.distanceKm || 0), 0) * 10) / 10;
        combinedSpent = Math.round(localHistory.reduce((acc, r) => acc + (r.price || 0), 0) * 100) / 100;
      }

      setStats({
        totalRides: combinedRides,
        completedRides: fetchedStats.completedRides || combinedRides,
        totalKm: combinedKm,
        totalSpent: combinedSpent
      });

      setRidesHistory(fetchedHistory);
    } catch (e) {
      console.warn('Error loading passenger details:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  // Handle Login: requires Name and CI
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !ci.trim()) {
      setErrorMessage('Ingresa tu Nombre y tu Cédula de Identidad (CI) para acceder.');
      return;
    }

    setIsLoading(true);
    const { passenger, error } = await loginPassenger(fullName, ci);
    setIsLoading(false);

    if (error || !passenger) {
      setErrorMessage(error || 'No se pudo iniciar sesión.');
    } else {
      onPassengerChanged(passenger);
      setSuccessMessage(`¡Bienvenido de nuevo, ${passenger.full_name || 'Pasajero'}!`);
      loadPassengerData(passenger.id);
    }
  };

  // Handle Registration: requires Name, Phone, and CI
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !phone.trim() || !ci.trim()) {
      setErrorMessage('Por favor completa todos los campos (Nombre, Teléfono y CI).');
      return;
    }

    setIsLoading(true);
    const { passenger, error } = await registerPassenger(fullName, phone, ci);
    setIsLoading(false);

    if (error || !passenger) {
      setErrorMessage(error || 'Error al registrar tu cuenta.');
    } else {
      onPassengerChanged(passenger);
      setSuccessMessage('¡Cuenta creada y sesión iniciada con éxito!');
      loadPassengerData(passenger.id);
    }
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassenger) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const result = await updatePassengerProfile(currentPassenger.id, fullName, phone, ci);
    setIsLoading(false);

    if (result.success && result.passenger) {
      onPassengerChanged(result.passenger);
      setSuccessMessage('Perfil actualizado correctamente.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } else {
      setErrorMessage(result.error || 'Error al actualizar perfil.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentPassenger(null);
    onPassengerChanged(null);
    setFullName('');
    setPhone('');
    setCi('');
    setErrorMessage(null);
    setSuccessMessage('Has cerrado sesión.');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                {currentPassenger ? 'Mi Perfil de Pasajero' : 'Cuenta de Pasajero'}
                {currentPassenger && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold px-1.5 py-0.5 rounded-full">
                    Activo
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {currentPassenger ? 'Datos, estadísticas e historial de carreras' : 'Ingresa o regístrate en Moto Campeón'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ==================================================== */}
          {/* VIEW A: NOT LOGGED IN (LOGIN / REGISTER TABS) */}
          {/* ==================================================== */}
          {!currentPassenger ? (
            <div className="space-y-4">
              {/* Tabs Switcher */}
              <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    authMode === 'login'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Iniciar Sesión (CI y Nombre)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    authMode === 'register'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              {/* Login Form */}
              {authMode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Juan Pérez Morales"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        Cédula de Identidad (CI)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 8945123 SC"
                        value={ci}
                        onChange={(e) => setCi(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 px-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Tu sesión se mantendrá guardada para que no tengas que ingresar tus datos cada vez.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando credenciales...
                      </>
                    ) : (
                      <>
                        Ingresar a Moto Campeón
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      ¿Primera vez aquí? Regístrate con tu teléfono y CI
                    </button>
                  </div>
                </form>
              )}

              {/* Register Form */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Carlos Suárez"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Número de Teléfono (WhatsApp)
                      </label>
                      <input
                        type="tel"
                        placeholder="+591 7XXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        Cédula de Identidad (CI)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 7891234 SC"
                        value={ci}
                        onChange={(e) => setCi(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creando cuenta de pasajero...
                      </>
                    ) : (
                      <>
                        Registrarme y Guardar Sesión
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-xs text-slate-400 hover:text-white hover:underline font-semibold"
                    >
                      ¿Ya tienes cuenta? Ingresa con tu CI y Nombre
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ==================================================== */
            /* VIEW B: LOGGED IN (PROFILE, STATS, EDIT, HISTORY) */
            /* ==================================================== */
            <div className="space-y-4">
              {/* User Profile Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg shadow-amber-500/20">
                    {(currentPassenger.full_name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-base">
                      {currentPassenger.full_name || 'Pasajero Moto Campeón'}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>CI: {currentPassenger.ci || 'No registrado'}</span>
                      <span>•</span>
                      <span>{currentPassenger.phone}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-slate-700/60 transition active:scale-95"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* 3 Metric Cards: Kilómetros recorridos, Viajes, Gasto total */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    <RouteIcon className="w-3.5 h-3.5" />
                    Km Totales
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1">
                    {stats.totalKm} <span className="text-xs text-slate-400 font-normal">km</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Recorridos</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5" />
                    Viajes
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1">
                    {stats.totalRides}
                  </div>
                  <div className="text-[10px] text-slate-500">Realizados</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Inversión
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1">
                    Bs {stats.totalSpent.toFixed(0)}
                  </div>
                  <div className="text-[10px] text-slate-500">En transporte</div>
                </div>
              </div>

              {/* Navigation Tabs between Profile Config and Rides History */}
              <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setProfileTab('profile')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                    profileTab === 'profile'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  Configuración del Perfil
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('history')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                    profileTab === 'history'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  Historial de Carreras ({stats.totalRides})
                </button>
              </div>

              {/* Tab 1: Profile Configuration Form */}
              {profileTab === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-3.5">
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Teléfono Móvil
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        Cédula de Identidad (CI)
                      </label>
                      <input
                        type="text"
                        value={ci}
                        onChange={(e) => setCi(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Guardando cambios...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Guardar Configuración de Perfil
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Tab 2: Passenger Rides History */}
              {profileTab === 'history' && (
                <div className="space-y-3">
                  {isLoadingHistory ? (
                    <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      Cargando historial de carreras...
                    </div>
                  ) : ridesHistory.length === 0 && localHistory.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                      Aún no tienes viajes registrados. Tus próximas solicitudes aparecerán aquí.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {ridesHistory.length > 0
                        ? ridesHistory.map((ride) => (
                            <div
                              key={ride.id}
                              className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-slate-400">
                                  {new Date(ride.created_at).toLocaleDateString('es-BO', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      ride.status === 'completado'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : ride.status === 'en_curso' || ride.status === 'aceptado'
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : ride.status === 'cancelado'
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}
                                  >
                                    {ride.status}
                                  </span>
                                  <span className="font-extrabold text-amber-400 text-sm">
                                    Bs {Number(ride.price || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                  <span className="truncate">{ride.origin_address || 'Origen'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                                  <span className="truncate">{ride.destination_address || 'Destino'}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                                <span>
                                  {ride.distance_km ? `${ride.distance_km} km` : ''}{' '}
                                  {ride.duration_minutes ? `• ~${ride.duration_minutes} min` : ''}
                                  {ride.has_cargo ? ' • Con Carga 🎒' : ''}
                                </span>

                                {onRepeatRide && (
                                  <button
                                    onClick={() => {
                                      const oLat = Number(ride.origin_lat);
                                      const oLng = Number(ride.origin_lng);
                                      const dLat = Number(ride.destination_lat);
                                      const dLng = Number(ride.destination_lng);
                                      if (
                                        !isNaN(oLat) && !isNaN(oLng) && !isNaN(dLat) && !isNaN(dLng) &&
                                        isFinite(oLat) && isFinite(oLng) && isFinite(dLat) && isFinite(dLng)
                                      ) {
                                        onRepeatRide({
                                          id: 'repeat-' + Date.now(),
                                          origin: { lat: oLat, lng: oLng },
                                          originAddress: ride.origin_address || '',
                                          destination: { lat: dLat, lng: dLng },
                                          destinationAddress: ride.destination_address || '',
                                          price: Number(ride.price || 0),
                                          distanceKm: Number(ride.distance_km || 1),
                                          durationMins: Number(ride.duration_minutes || 5),
                                          status: 'draft',
                                          hasCargo: Boolean(ride.has_cargo),
                                          cargoDescription: ride.cargo_description || undefined,
                                          createdAt: new Date().toISOString()
                                        });
                                        onClose();
                                      }
                                    }}
                                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold hover:underline"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Repetir ruta
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        : localHistory.map((ride) => (
                            <div
                              key={ride.id}
                              className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-slate-400">
                                  {new Date(ride.createdAt).toLocaleDateString('es-BO', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <span className="font-extrabold text-amber-400 text-sm">
                                  Bs {ride.price.toFixed(2)}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                  <span className="truncate">{ride.originAddress}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                                  <span className="truncate">{ride.destinationAddress}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                                <span>{ride.distanceKm} km • ~{ride.durationMins} min</span>
                                {onRepeatRide && (
                                  <button
                                    onClick={() => {
                                      onRepeatRide(ride);
                                      onClose();
                                    }}
                                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold hover:underline"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Repetir ruta
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
