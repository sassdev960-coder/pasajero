import React from 'react';
import { X, Clock, MapPin, ArrowRight, RotateCcw, User } from 'lucide-react';
import { RideRequest } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  history: RideRequest[];
  onClose: () => void;
  onRepeatRide: (ride: RideRequest) => void;
  onOpenPassengerModal?: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  history,
  onClose,
  onRepeatRide,
  onOpenPassengerModal
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md max-h-[85vh] shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Historial de Carreras</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Link Banner */}
        {onOpenPassengerModal && (
          <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <User className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Ver mis Km acumulados y perfil</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenPassengerModal();
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition text-[11px]"
            >
              Mi Perfil
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/80">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Aún no tienes viajes registrados. Pide tu primera carrera en Moto Campeón.
            </div>
          ) : (
            history.map((ride) => (
              <div key={ride.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(ride.createdAt).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="font-bold text-amber-400 text-sm">Bs {ride.price.toFixed(2)}</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                    <span className="text-slate-200 truncate">{ride.originAddress}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 mt-1 flex-shrink-0" />
                    <span className="text-slate-200 truncate">{ride.destinationAddress}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {ride.distanceKm} km • ~{ride.durationMins} min {ride.hasCargo ? '• Con Carga 🎒' : ''}
                  </span>
                  <button
                    onClick={() => {
                      onRepeatRide(ride);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 py-1 px-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Repetir ruta
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
