import React, { useState, useEffect } from 'react';
import { Bike, Loader2, X, Shield, Sparkles, CheckCircle2, Eye, Clock, Navigation } from 'lucide-react';
import { isSupabaseConfigured, acceptRideAsDriverInSupabase } from '../services/supabaseClient';
import { SupabaseDriver, DriverViewInfo, LatLng } from '../types';

interface WaitingDriverPanelProps {
  rideId: string;
  origin?: LatLng | null;
  originAddress: string;
  destinationAddress: string;
  price: number;
  hasCargo: boolean;
  onlineDrivers?: SupabaseDriver[];
  viewedDrivers?: DriverViewInfo[];
  onCancel: () => void;
  onSimulateAccept: (driver?: SupabaseDriver) => void;
}

export const WaitingDriverPanel: React.FC<WaitingDriverPanelProps> = ({
  rideId,
  origin,
  originAddress,
  destinationAddress,
  price,
  hasCargo,
  onlineDrivers = [],
  viewedDrivers = [],
  onCancel,
  onSimulateAccept
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const isConnected = isSupabaseConfigured();

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSimulateAccept = async (driver: SupabaseDriver | DriverViewInfo) => {
    setIsSimulating(true);
    let targetDriver: SupabaseDriver | undefined;

    if ('phone' in driver) {
      targetDriver = driver as SupabaseDriver;
    } else {
      // DriverViewInfo
      const matched = onlineDrivers.find(d => d.id === driver.driver_id);
      if (matched) {
        targetDriver = matched;
      }
    }

    if (targetDriver) {
      if (isConnected) {
        await acceptRideAsDriverInSupabase(rideId, targetDriver.id);
      }
      onSimulateAccept(targetDriver);
    }
    setIsSimulating(false);
  };

  return (
    <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-30 bg-slate-900/95 border border-slate-700/90 rounded-3xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Buscando Conductores Cercanos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            {formatTime(elapsedSeconds)}
          </span>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
            title="Cancelar solicitud"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Radar / Search Summary */}
      <div className="py-3 flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-950 border border-amber-500/40 text-amber-400 shrink-0 overflow-hidden p-1 shadow-md">
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/30 animate-ping" />
          <img
            src="/moto-campeon.png"
            alt="Moto Móvil El Campeón"
            className="w-full h-full object-contain relative z-10 filter drop-shadow"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Tarifa Solicitada</h4>
            <span className="text-base font-extrabold text-amber-400">Bs {price.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            Destino: {destinationAddress || 'Punto fijado'}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}>
              {isConnected ? '● Supabase Realtime' : '● Red Móvil Activa'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/30">
              🟢 {onlineDrivers.length} {onlineDrivers.length === 1 ? 'moto en línea' : 'motos en línea'}
            </span>
            {hasCargo && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                📦 Con carga
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: CONDUCTORES QUE HAN VISTO LA SOLICITUD */}
      <div className="pt-2.5 pb-2 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">
              Conductores que vieron tu solicitud:
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
            {viewedDrivers.length} {viewedDrivers.length === 1 ? 'visto' : 'vistos'}
          </span>
        </div>

        {viewedDrivers.length > 0 ? (
          <div className="space-y-2">
            {viewedDrivers.map((driverView, idx) => (
              <div
                key={driverView.driver_id || idx}
                className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between transition animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={driverView.driver_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                      alt={driverView.driver_name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-slate-900 flex items-center justify-center text-[7px]">
                      ✓
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white truncate">
                        {driverView.driver_name}
                      </span>
                      <span className="text-[9px] font-black uppercase bg-amber-400 text-slate-950 px-1 rounded">
                        Vio tu pedido
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
                      <span>🏍️ {driverView.vehicle_model}</span>
                      <span className="text-amber-300 font-semibold">• Llegada: ~{driverView.eta_mins} min</span>
                    </div>
                    {driverView.distance_km && (
                      <div className="text-[10px] text-emerald-400 font-medium">
                        Distancia aproximada: {driverView.distance_km} km
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleSimulateAccept(driverView)}
                  disabled={isSimulating}
                  className="ml-2 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-1 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aceptar Oferta</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span>Emitiendo alerta a conductores cercanos... cuando abran tu solicitud aparecerán aquí.</span>
          </div>
        )}
      </div>

      {/* SECTION 2: CONDUCTORES DISPONIBLES EN EL MAPA */}
      <div className="pt-2 border-t border-slate-800">
        <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1.5">
          <span className="font-semibold text-slate-300">Conductores activos en el mapa:</span>
          <span className="text-[10px] text-emerald-400 font-bold">Visibles en tiempo real</span>
        </div>

        {onlineDrivers.length > 0 ? (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {onlineDrivers.slice(0, 3).map(drv => {
              const hasSeen = viewedDrivers.some(v => v.driver_id === drv.id);
              return (
                <div
                  key={drv.id}
                  className="py-1.5 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-left flex items-center justify-between transition text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={drv.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                      alt={drv.full_name}
                      className="w-7 h-7 rounded-full object-cover border border-emerald-400/60 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate">{drv.full_name}</span>
                        {hasSeen && (
                          <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">
                            Visto
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {drv.vehicle_model || 'Motocicleta'} • Placa: {drv.vehicle_plate || 'SCZ'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSimulateAccept(drv)}
                    disabled={isSimulating}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-200 font-bold text-[10px] transition shrink-0"
                  >
                    Asignar
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <div className="flex items-center justify-center gap-1.5 text-slate-300 font-semibold text-xs">
              <Bike className="w-3.5 h-3.5 text-amber-400" />
              <span>Esperando conductores disponibles</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              No hay conductores con estado disponible en este momento. Tu solicitud se mantendrá activa para cuando un conductor se conecte.
            </p>
          </div>
        )}

        <button
          onClick={onCancel}
          className="w-full mt-2 py-1.5 text-center text-xs text-slate-400 hover:text-red-400 transition"
        >
          Cancelar solicitud de viaje
        </button>
      </div>
    </div>
  );
};
