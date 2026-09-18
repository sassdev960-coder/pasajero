import React, { useState } from 'react';
import { Bike, History, MapPin, Database, User } from 'lucide-react';
import { LatLng, SupabasePassenger } from '../types';

interface HeaderProps {
  userLocation: LatLng | null;
  isSupabaseConnected: boolean;
  currentPassenger: SupabasePassenger | null;
  onOpenAnalysis?: () => void;
  onOpenHistory: () => void;
  onCenterUserLocation: () => void;
  onOpenCityPicker: () => void;
  onOpenSupabase: () => void;
  onOpenPassengerModal: () => void;
  // ⚠️ Props opcionales (mantenidas por compatibilidad con App.tsx, ya no se usan)
  selectedCategory?: string | null;
  onSelectCategory?: (cat: string | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSupabaseConnected,
  currentPassenger,
  onOpenHistory,
  onOpenCityPicker,
  onOpenSupabase,
  onOpenPassengerModal
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex flex-col p-3 gap-2">
      {/* Top Floating App Bar */}
      <div className="w-full flex items-center justify-between pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3 py-2 shadow-2xl backdrop-blur-md">
        {/* Logo & Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center font-black shadow-md shadow-amber-500/20 overflow-hidden p-0.5">
            {!imgFailed ? (
              <img
                src="/moto-campeon.png"
                alt="Moto Móvil El Campeón"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <Bike className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white">Moto Móvil El Campeón</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">
              Transporte en moto rápido y seguro
            </p>
          </div>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Change City Button */}
          <button
            onClick={onOpenCityPicker}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95 flex items-center gap-1"
            title="Cambiar de ciudad"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold hidden md:inline">Ciudad</span>
          </button>

          {/* Passenger Profile / Session Button */}
          <button
            onClick={onOpenPassengerModal}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 ${
              currentPassenger
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-750'
            }`}
            title={currentPassenger ? `Perfil de ${currentPassenger.full_name || 'Pasajero'}` : 'Iniciar Sesión / Registrarse'}
          >
            <div className="w-5 h-5 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-[11px] font-black shadow-sm">
              {currentPassenger?.full_name ? currentPassenger.full_name.charAt(0).toUpperCase() : <User className="w-3 h-3 text-slate-950" />}
            </div>
            <span className="text-[11px] font-bold max-w-[65px] truncate hidden sm:inline">
              {currentPassenger?.full_name ? currentPassenger.full_name.split(' ')[0] : 'Pasajero'}
            </span>
          </button>

          {/* Supabase DB Button */}
          <button
            onClick={onOpenSupabase}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 ${
              isSupabaseConnected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-750'
            }`}
            title="Conexión de conductores y base de datos"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono font-bold hidden sm:inline">
              {isSupabaseConnected ? 'BD' : 'Config'}
            </span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95"
            title="Historial de carreras"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
