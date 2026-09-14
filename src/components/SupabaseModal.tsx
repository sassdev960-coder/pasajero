import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle, AlertCircle, RefreshCw, Key, Link as LinkIcon, Users, Bike, Shield } from 'lucide-react';
import { getSupabaseCredentials, updateSupabaseCredentials, testSupabaseConnection, isSupabaseConfigured, getActiveDrivers } from '../services/supabaseClient';
import { SupabaseDriver } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; driversCount?: number } | null>(null);
  const [drivers, setDrivers] = useState<SupabaseDriver[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setKey(creds.key);
      setTestResult(null);
      setSaveSuccess(false);

      if (isSupabaseConfigured()) {
        handleTestConnection(false);
      }
    }
  }, [isOpen]);

  const handleTestConnection = async (showNotification = true) => {
    setIsTesting(true);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      const activeDrivers = await getActiveDrivers();
      setDrivers(activeDrivers);
    }
  };

  const handleSave = () => {
    if (!url.trim() || !key.trim()) {
      alert('Por favor ingresa la URL del proyecto y la Clave Anónima (anon public key).');
      return;
    }

    updateSupabaseCredentials(url, key);
    setSaveSuccess(true);
    handleTestConnection();
    onConfigSaved();

    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Conexión a Supabase
                {isConfigured && testResult?.success && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    En Vivo
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Sincronización en tiempo real para carreras y conductores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Alert Banner */}
          {testResult ? (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">{testResult.message}</div>
                {testResult.success && (
                  <div className="text-[11px] text-emerald-400/90 mt-0.5">
                    Conductores registrados encontrados: <b>{testResult.driversCount ?? 0}</b>
                  </div>
                )}
              </div>
            </div>
          ) : !isConfigured ? (
            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Credenciales pendientes:</span> Ingresa tu URL de proyecto y Clave Anónima de Supabase para activar la recepción de carreras y conductores en tiempo real.
              </div>
            </div>
          ) : null}

          {/* Credentials Inputs */}
          <div className="space-y-3 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                Project URL (Supabase URL)
              </label>
              <input
                type="text"
                placeholder="https://xyzabcdefghijk.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Anon Public Key (API Key)
              </label>
              <textarea
                rows={2}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestConnection()}
                  disabled={isTesting || !url || !key}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-3 py-2 rounded-xl transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
                  Probar Conexión
                </button>
                <button
                  onClick={() => {
                    const creds = getSupabaseCredentials();
                    setUrl(creds.url);
                    setKey(creds.key);
                    updateSupabaseCredentials(creds.url, creds.key);
                    handleTestConnection();
                  }}
                  className="text-[11px] font-semibold text-cyan-400 hover:underline px-1 py-1"
                >
                  Restaurar Central
                </button>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-900/30"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {saveSuccess ? '¡Guardado!' : 'Guardar y Conectar'}
              </button>
            </div>
          </div>

          {/* Database Schema Verification Checklist */}
          <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              Estructura de Base de Datos Detectada
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold block">public.rides</span>
                <span className="text-slate-400">Origen, destino, precio, estado, carga, conductor</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-mono text-blue-400 font-bold block">public.drivers</span>
                <span className="text-slate-400">Nombre, foto, teléfono, moto y placa</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-mono text-amber-400 font-bold block">public.driver_status</span>
                <span className="text-slate-400">Ubicación GPS en vivo del conductor</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-mono text-purple-400 font-bold block">Supabase Realtime</span>
                <span className="text-slate-400">Notificaciones automáticas al aceptar carrera</span>
              </div>
            </div>
          </div>

          {/* Active Drivers in DB preview */}
          {drivers.length > 0 && (
            <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-amber-400" />
                Conductores Activos en Base de Datos ({drivers.length})
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {drivers.map(d => (
                  <div key={d.id} className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={d.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                        alt={d.full_name}
                        className="w-7 h-7 rounded-full object-cover border border-amber-500/40"
                      />
                      <div>
                        <div className="font-bold text-white text-[11px] leading-tight">{d.full_name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {d.vehicle_model || 'Motocicleta'} • {d.vehicle_plate || 'Sin placa'}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">{d.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Las credenciales se guardan de forma local en tu navegador.</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
