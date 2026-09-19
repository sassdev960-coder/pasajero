import React, { useState, useEffect } from 'react';
import { Loader2, X, Eye, Clock, ChevronDown, ChevronUp, Users, MapPin } from 'lucide-react';
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
  panelExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  onCenterOnlineDrivers?: () => void;
  onCancel: () => void;
}

export const WaitingDriverPanel: React.FC<WaitingDriverPanelProps> = ({
  rideId,
  originAddress,
  destinationAddress,
  price,
  hasCargo,
  onlineDrivers = [],
  viewedDrivers = [],
  panelExpanded,
  onToggleExpanded,
  onCenterOnlineDrivers,
  onCancel
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const viewedCount = viewedDrivers.length;

  // ═══════════════════════════════════════════════════════════════
  //  COMPACTO
  // ═══════════════════════════════════════════════════════════════
  if (!panelExpanded) {
    return (
      <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-950/95 border border-amber-500/40 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => onToggleExpanded(true)}
          className="w-full px-4 py-2 flex items-center justify-between bg-slate-900/70 border-b border-slate-800/80"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wide">
              Buscando conductor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {formatTime(elapsedSeconds)}
            </span>
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </div>
        </button>

        <div className="p-3.5 flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-900 border border-amber-500/40 overflow-hidden shrink-0">
            <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/30 animate-ping" />
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin relative z-10" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 truncate">{destinationAddress}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                🟢 {onlineDrivers.length} en línea
              </span>
              {viewedCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {viewedCount} {viewedCount === 1 ? 'vio' : 'vieron'}
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-base font-black text-amber-400">Bs {price.toFixed(2)}</div>
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="text-[10px] text-slate-400 hover:text-red-400 font-bold underline mt-0.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPANDIDO
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="mt-auto max-h-[92vh] w-full bg-slate-950 border-t-2 border-amber-500/40 rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        <button
          onClick={() => onToggleExpanded(false)}
          className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/70"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-black text-amber-400">Buscando conductor</span>
            <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mensaje principal */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-amber-500/40 mb-2">
              <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
            </div>
            <div className="text-sm font-black text-white">Emitiendo alerta a conductores cercanos</div>
            <div className="text-[11px] text-slate-400 mt-1">
              {viewedCount > 0
                ? `${viewedCount} ${viewedCount === 1 ? 'conductor está viendo' : 'conductores están viendo'} tu solicitud`
                : 'Esperando a que un conductor acepte tu viaje...'}
            </div>
          </div>

          {/* Resumen del viaje */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Tu viaje</div>
            <div className="text-xs text-slate-300 mb-1">
              <span className="text-slate-500">Desde:</span> {originAddress}
            </div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">Hasta:</span> {destinationAddress}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
              <div className="text-[11px] text-slate-400">
                {hasCargo && <span className="text-amber-400 font-bold">📦 Con carga • </span>}
                Tarifa fija
              </div>
              <div className="text-base font-black text-amber-400">Bs {price.toFixed(2)}</div>
            </div>
          </div>

          {/* Conductores en línea */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  En línea ahora ({onlineDrivers.length})
                </span>
              </div>
              {onCenterOnlineDrivers && onlineDrivers.length > 0 && (
                <button
                  onClick={onCenterOnlineDrivers}
                  className="text-[11px] font-bold text-amber-400 flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  Ver en mapa
                </button>
              )}
            </div>

            {onlineDrivers.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-3">
                Aún no hay conductores conectados
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {onlineDrivers.map((driver) => {
                  const hasViewed = viewedDrivers.some(v =>
                    (typeof v === 'string' && v === driver.id) ||
                    (typeof v === 'object' && v?.driver_id === driver.id)
                  );
                  const firstName = (driver.full_name || 'Conductor').split(' ')[0];
                  return (
                    <div
                      key={driver.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                        hasViewed
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-slate-800/40 border-slate-700/60'
                      }`}
                    >
                      <img
                        src={driver.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'}
                        alt={firstName}
                        className="w-9 h-9 rounded-full object-cover border-2 border-slate-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{firstName}</span>
                          {hasViewed && (
                            <span className="text-[9px] font-black uppercase bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" />
                              Vio
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          🏍️ {driver.vehicle_model || 'Motocicleta'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-bold text-sm border border-slate-700 hover:border-red-500/40 transition"
          >
            Cancelar solicitud
          </button>
        </div>
      </div>
    </div>
  );
};
