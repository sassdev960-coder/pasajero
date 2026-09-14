import React from 'react';
import { Phone, MessageCircle, Star, ShieldCheck, CheckCircle2, X, Navigation, Play, Bike } from 'lucide-react';
import { Driver } from '../types';

interface DriverPanelProps {
  driver: Driver;
  status: 'asignado' | 'en_camino' | 'llegado_origen' | 'en_curso';
  etaMinutes: number;
  driverDistanceMeters?: number;
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

  return (
    <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-30 bg-slate-900/95 border border-slate-700/90 rounded-3xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            status === 'llegado_origen' ? 'bg-amber-400 animate-bounce' : 'bg-emerald-400 animate-ping'
          }`} />
          <div className="min-w-0">
            <span className={`text-xs font-black uppercase tracking-wide truncate block ${
              status === 'llegado_origen' ? 'text-amber-400 font-bold' : 'text-emerald-400'
            }`}>
              {status === 'asignado' && '¡Conductor Aceptó tu Carrera!'}
              {status === 'en_camino' && (
                distanceText 
                  ? `Moto acercándose: a ${distanceText} (~${etaMinutes} min)` 
                  : `Conductor en camino (~${etaMinutes} min)`
              )}
              {status === 'llegado_origen' && '¡Tu conductor ha llegado a tu punto de partida!'}
              {status === 'en_curso' && 'Viaje en progreso hacia el destino final'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onCenterDriver && (status === 'asignado' || status === 'en_camino') && (
            <button
              onClick={onCenterDriver}
              className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-0.5 rounded-lg transition"
              title="Centrar conductor en el mapa"
            >
              Ver moto
            </button>
          )}
          <button
            onClick={onCancelRide}
            className="text-xs text-slate-400 hover:text-red-400 font-semibold px-2 py-0.5 rounded-lg hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Prominent Arrival ETA Card */}
      {(status === 'asignado' || status === 'en_camino') && (
        <div className="my-2 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-base font-bold shrink-0">
              ⏱️
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Tiempo estimado de llegada
              </div>
              <div className="text-base font-black text-white leading-tight">
                ~{etaMinutes} {etaMinutes === 1 ? 'minuto' : 'minutos'}
              </div>
            </div>
          </div>
          {distanceText && (
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block font-semibold">Distancia</span>
              <span className="text-xs font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-amber-500/30">
                {distanceText}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Driver Info Body */}
      <div className="py-2.5 flex items-center gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={driver.photoUrl}
            alt={driver.name}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-500 shadow-md"
          />
          <div className="absolute -bottom-1 -right-1 bg-slate-900 text-amber-400 p-0.5 rounded-full border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-sm sm:text-base font-bold text-white truncate">{driver.name}</h4>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{driver.rating}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 truncate">{driver.vehicle}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold rounded-md">
              {driver.plate}
            </span>
            {status === 'llegado_origen' && (
              <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                Esperando al pasajero
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action when driver has arrived: Big Start Trip Button */}
      {status === 'llegado_origen' && onStartTrip && (
        <button
          onClick={onStartTrip}
          className="w-full mb-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          Iniciar viaje hacia el destino
        </button>
      )}

      {/* Action Buttons: Call & WhatsApp */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <a
          href={`tel:${cleanPhone}`}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-400" />
          Llamar
        </a>

        <a
          href={`https://wa.me/${cleanPhone}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </a>
      </div>

      {/* Complete trip button */}
      <button
        onClick={onCompleteRide}
        className="w-full mt-2 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 transition border border-dashed border-slate-700"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {status === 'en_curso' ? 'Completar viaje y pagar' : 'Finalizar carrera anticipadamente'}
      </button>
    </div>
  );
};
