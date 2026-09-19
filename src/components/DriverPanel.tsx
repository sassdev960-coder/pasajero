import React from 'react';
import { Phone, MessageCircle, Star, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Play, Route as RouteIcon, Clock } from 'lucide-react';
import { Driver } from '../types';

interface DriverPanelProps {
  driver: Driver;
  status: 'asignado' | 'en_camino' | 'llegado_origen' | 'en_curso';
  etaMinutes: number;
  driverDistanceMeters?: number;
  panelExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  onStartTrip?: () => void;
  onCancelRide: () => void;
  onCompleteRide: () => void;
  onCenterDriver?: () => void;
}

export const DriverPanel: React.FC<DriverPanelProps> = ({
  driver,
  status,
  etaMinutes,
  driverDistanceMeters,
  panelExpanded,
  onToggleExpanded,
  onStartTrip,
  onCancelRide,
  onCompleteRide,
  onCenterDriver
}) => {
  const cleanPhone = driver.phone.replace(/[^0-9]/g, '');
  const waMsg = encodeURIComponent(`Hola ${driver.name}, soy tu pasajero de Moto Campeón. Te estoy esperando.`);

  const distanceText = driverDistanceMeters !== undefined
    ? (driverDistanceMeters >= 1000
        ? `${(driverDistanceMeters / 1000).toFixed(1)} km`
        : `${driverDistanceMeters} m`)
    : null;

  const statusLabel = 
    status === 'asignado' ? 'Conductor asignado' :
    status === 'en_camino' ? (distanceText ? `A ${distanceText}` : 'En camino') :
    status === 'llegado_origen' ? '¡Llegó!' :
    'En viaje';

  // ═══════════════════════════════════════════════════════════════
  //  COMPACTO
  // ═══════════════════════════════════════════════════════════════
  if (!panelExpanded) {
    return (
      <div className="absolute bottom-3 left-3 right-3 z-30 bg-slate-950/95 border border-amber-500/40 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom duration-300">
        <button
          onClick={() => onToggleExpanded(true)}
          className="w-full px-4 py-2 flex items-center justify-between bg-slate-900/70 border-b border-slate-800/80"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wide">
              {statusLabel}
            </span>
          </div>
          <ChevronUp className="w-4 h-4 text-slate-400" />
        </button>

        <div className="p-3.5 flex items-center gap-3">
          <img
            src={driver.photoUrl}
            alt={driver.name}
            className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">{driver.name}</span>
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                {driver.rating}
              </span>
            </div>
            {/* PLACA GRANDE */}
            <div className="mt-1 inline-flex">
              <span className="font-mono text-base font-black text-slate-950 bg-amber-400 px-2.5 py-0.5 rounded-md tracking-widest border-2 border-amber-600">
                {driver.plate}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            {onCenterDriver && (
              <button
                onClick={(e) => { e.stopPropagation(); onCenterDriver(); }}
                className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg"
              >
                Ver moto
              </button>
            )}
            <span className="text-[10px] text-slate-400 text-center font-mono">
              ~{etaMinutes} min
            </span>
          </div>
        </div>

        {status === 'llegado_origen' && onStartTrip && (
          <div className="px-3.5 pb-3.5">
            <button
              onClick={onStartTrip}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              Iniciar viaje
            </button>
          </div>
        )}
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
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-sm font-black text-emerald-400">{statusLabel}</span>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info del conductor */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <img
                src={driver.photoUrl}
                alt={driver.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-black text-white truncate">{driver.name}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {driver.rating}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">{driver.ridesCount} viajes</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{driver.vehicle}</div>
              </div>
            </div>
          </div>

          {/* PLACA ENORME */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">
              Placa del vehículo
            </div>
            <div className="inline-block bg-amber-400 rounded-2xl px-6 py-3 border-4 border-amber-600 shadow-2xl shadow-amber-500/30">
              <span className="font-mono text-4xl sm:text-5xl font-black text-slate-950 tracking-[0.15em] leading-none">
                {driver.plate}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-3">
              Verifica este número antes de subir
            </div>
          </div>

          {/* ETA y distancia */}
          {(status === 'asignado' || status === 'en_camino') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">Llegada</span>
                </div>
                <div className="text-2xl font-black text-white">~{etaMinutes} min</div>
              </div>
              {distanceText && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <RouteIcon className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] uppercase font-bold text-slate-400">Distancia</span>
                  </div>
                  <div className="text-2xl font-black text-white">{distanceText}</div>
                </div>
              )}
            </div>
          )}

          {/* Botones de contacto */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`tel:${cleanPhone}`}
              className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              Llamar
            </a>
            <a
              href={`https://wa.me/${cleanPhone}?text=${waMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>

        {/* Botones inferiores */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 space-y-2">
          {status === 'llegado_origen' && onStartTrip && (
            <button
              onClick={onStartTrip}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Iniciar viaje hacia el destino
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCancelRide}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-bold text-xs border border-slate-700 hover:border-red-500/40"
            >
              Cancelar viaje
            </button>
            <button
              onClick={onCompleteRide}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
