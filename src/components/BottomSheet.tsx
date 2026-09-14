import React, { useState } from 'react';
import { ArrowUpDown, Bike, Zap, Package, Camera, Check, ChevronRight, Clock, Navigation, Sparkles, HelpCircle, ChevronDown, ChevronUp, Maximize2, X, MapPin } from 'lucide-react';
import { LatLng, PricingConfig } from '../types';
import { calculateRideFare } from '../services/supabaseClient';

interface BottomSheetProps {
  originAddress: string;
  destinationAddress: string;
  origin: LatLng | null;
  destination: LatLng | null;
  distanceKm: number;
  durationMins: number;
  routeSummary: string;
  hasCargo: boolean;
  cargoDescription: string;
  cargoPhotoUrl: string | null;
  isSubmitting: boolean;
  pricingConfig?: PricingConfig;
  isMinimized?: boolean;
  onToggleMinimize?: (minimized: boolean) => void;
  onOpenSearch: (isOrigin: boolean) => void;
  onSwapLocations: () => void;
  onClearDestination: () => void;
  onPickOnMap?: (isOrigin: boolean) => void;
  onToggleCargo: (enabled: boolean) => void;
  onChangeCargoDesc: (text: string) => void;
  onUploadCargoPhoto: (file: File) => void;
  onRequestRide: (rideType?: 'moto', price?: number) => void;
  motoImageUrl?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  originAddress,
  destinationAddress,
  origin,
  destination,
  distanceKm,
  durationMins,
  routeSummary,
  hasCargo,
  cargoDescription,
  cargoPhotoUrl,
  isSubmitting,
  pricingConfig,
  isMinimized: controlledMinimized,
  onToggleMinimize,
  onOpenSearch,
  onSwapLocations,
  onClearDestination,
  onPickOnMap,
  onToggleCargo,
  onChangeCargoDesc,
  onUploadCargoPhoto,
  onRequestRide,
  motoImageUrl = '/moto-campeon.png'
}) => {
  const [localMinimized, setLocalMinimized] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isMinimized = controlledMinimized !== undefined ? controlledMinimized : localMinimized;
  const toggleMin = (val: boolean) => {
    setLocalMinimized(val);
    onToggleMinimize?.(val);
  };

  // Dynamic fare calculation from active admin pricing config
  const fareResult = calculateRideFare(distanceKm, hasCargo, pricingConfig);
  const motoPrice = fareResult.motoFare;

  const hasBothPoints = Boolean(origin && destination);

  // Minimized state view on mobile: leaves the entire map and route clear
  if (isMinimized && hasBothPoints) {
    return (
      <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-950/95 border border-slate-700/90 rounded-2xl shadow-2xl p-3 flex items-center justify-between backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200">
        <div
          onClick={() => toggleMin(false)}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 mr-2"
        >
          <div className="w-12 h-10 rounded-xl bg-slate-900 border border-amber-500/40 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md overflow-hidden p-0.5">
            {!imageError ? (
              <img
                src={motoImageUrl}
                alt="Moto Móvil El Campeón"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : (
              <Bike className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{distanceKm} km • ~{durationMins} min</span>
              <span className="text-xs font-black text-amber-400">Bs {motoPrice.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {destinationAddress ? `Destino: ${destinationAddress}` : 'Toca para ver opciones completas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onRequestRide('moto', motoPrice)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-md flex items-center gap-1 transition"
          >
            <span>Pedir Moto</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMin(false)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 active:scale-95 transition"
            title="Expandir panel de solicitud"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-slate-950 border-t border-slate-800 rounded-t-3xl shadow-2xl p-4 flex flex-col gap-3 max-h-[74vh] overflow-y-auto">
      {/* Top drag handle indicator & Minimize header */}
      <div className="flex items-center justify-between -mt-1 mb-1">
        <div className="w-16">
          {hasBothPoints && (
            <button
              onClick={() => toggleMin(true)}
              className="text-[11px] font-bold text-slate-400 hover:text-amber-400 flex items-center gap-1 transition py-1"
              title="Ocultar panel para ver la ruta en mapa completo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Ver mapa</span>
            </button>
          )}
        </div>

        <div 
          onClick={() => hasBothPoints && toggleMin(true)}
          className="w-12 h-1.5 bg-slate-700 hover:bg-slate-600 rounded-full cursor-pointer transition"
        />

        <div className="w-16 flex justify-end">
          {hasBothPoints && (
            <button
              onClick={() => toggleMin(true)}
              className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg hover:bg-amber-500/20 transition flex items-center gap-1"
            >
              <span>Minimizar</span>
            </button>
          )}
        </div>
      </div>

      {/* Origin & Destination Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 relative shadow-inner">
        {/* Visual Line & Dots */}
        <div className="flex flex-col items-center gap-1 my-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          <div className="w-0.5 h-7 bg-slate-700" />
          <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
        </div>

        {/* Inputs */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Pickup */}
          <div
            onClick={() => onOpenSearch(true)}
            className="cursor-pointer group flex items-center justify-between pr-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Punto de Partida
              </div>
              <div className="text-sm font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition">
                {originAddress || 'Definir punto de recogida...'}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
          </div>

          <div className="border-t border-slate-800/80" />

          {/* Destination */}
          <div className="flex items-center justify-between group gap-2 pr-1">
            <div
              onClick={() => onOpenSearch(false)}
              className="cursor-pointer min-w-0 flex-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Destino
                </span>
                {destination && (
                  <span className="text-[10px] font-bold text-amber-400 hover:text-amber-300">
                    Cambiar
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold text-slate-100 truncate group-hover:text-orange-400 transition">
                {destinationAddress || (
                  <span className="text-slate-400 font-normal">
                    ¿A dónde te llevamos? Toca para buscar
                  </span>
                )}
              </div>
            </div>

            {/* Destination Actions: Clear (X) or Quick Map Pick */}
            <div className="flex items-center gap-1.5 shrink-0">
              {destination ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearDestination();
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 transition active:scale-90"
                  title="Quitar destino actual para elegir otro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  {onPickOnMap && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickOnMap(false);
                      }}
                      className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 font-bold text-[11px] border border-slate-700 transition flex items-center gap-1 active:scale-95"
                      title="Fijar destino directamente en el mapa con el puntero"
                    >
                      <MapPin className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] hidden sm:inline">En mapa</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenSearch(false)}
                    className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition border border-orange-500/30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swap Button */}
        {hasBothPoints && (
          <button
            onClick={onSwapLocations}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 shadow transition active:scale-95 flex-shrink-0"
            title="Invertir origen y destino"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Real-time Route Stats Banner (When route exists) */}
      {hasBothPoints && (
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">{distanceKm} km</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 truncate max-w-[140px]">{routeSummary}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-800/40">
            <Clock className="w-3.5 h-3.5" />
            ~{durationMins} min
          </div>
        </div>
      )}

      {/* Cargo Transport Option */}
      {hasBothPoints && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-100">
                  ¿Llevas equipaje, bultos o mercadería?
                </span>
                <span className="text-[11px] block text-amber-400 font-semibold">
                  +Bs 4.00 (equipaje / bultos)
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hasCargo}
              onChange={(e) => onToggleCargo(e.target.checked)}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </label>

          {hasCargo && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2">
              <input
                type="text"
                value={cargoDescription}
                onChange={(e) => onChangeCargoDesc(e.target.value)}
                placeholder="Describe la carga (ej: caja de 10kg, mochila grande, herramientas)"
                className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{cargoPhotoUrl ? 'Cambiar foto' : 'Subir foto del bulto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadCargoPhoto(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                </label>
                {cargoPhotoUrl && (
                  <img
                    src={cargoPhotoUrl}
                    alt="Bulto"
                    className="w-8 h-8 rounded-lg object-cover border border-amber-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vehicle / Ride Service Option Card (Direct Final Price with Image Support) */}
      {hasBothPoints && (
        <div className="p-3.5 rounded-2xl border bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900 border-amber-500/40 ring-1 ring-amber-500/30 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            {/* Vehicle Image Container */}
            <div className="w-20 h-16 sm:w-24 sm:h-18 rounded-xl bg-slate-900/90 border border-amber-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1 group">
              {!imageError ? (
                <img
                  src={motoImageUrl}
                  alt="Moto Móvil El Campeón"
                  className="w-full h-full object-contain filter drop-shadow hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Bike className="w-8 h-8 text-amber-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-white tracking-tight">Moto Móvil El Campeón</span>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black px-1.5 py-0.2 rounded uppercase shrink-0">
                  Oficial
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Transporte seguro en moto • Tarifa regulada
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 pl-2">
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Total</span>
            <span className="text-xl font-black text-amber-400 tracking-tight">
              Bs {motoPrice.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Main Request Button */}
      {hasBothPoints ? (
        <button
          onClick={() => onRequestRide('moto', motoPrice)}
          disabled={isSubmitting}
          className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Conectando con conductores en tiempo real...
            </>
          ) : (
            <>
              <Bike className="w-5 h-5" />
              Pedir Moto Móvil El Campeón • Bs {motoPrice.toFixed(2)}
            </>
          )}
        </button>
      ) : (
        <button
          onClick={() => onOpenSearch(!origin)}
          className="w-full py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700"
        >
          {!origin ? 'Definir Punto de Partida' : 'Seleccionar Punto de Destino'}
        </button>
      )}
    </div>
  );
};
