import React, { useState } from 'react';
import {
  ArrowUpDown, Bike, Package, Camera, Check, ChevronRight, ChevronDown, ChevronUp,
  Clock, Navigation, MapPin, X, Users, Eye, Route as RouteIcon, Trash2, Baby, User as UserIcon
} from 'lucide-react';
import { LatLng, PricingConfig, SupabaseDriver, DriverViewInfo, CompanionType } from '../types';
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
  companionType: CompanionType;
  onCompanionTypeChange: (type: CompanionType) => void;
  isSubmitting: boolean;
  pricingConfig?: PricingConfig;
  panelExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  onlineDrivers?: SupabaseDriver[];
  viewedDrivers?: DriverViewInfo[];
  onCenterOnlineDrivers?: () => void;
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
  companionType,
  onCompanionTypeChange,
  isSubmitting,
  pricingConfig,
  panelExpanded,
  onToggleExpanded,
  onlineDrivers = [],
  viewedDrivers = [],
  onCenterOnlineDrivers,
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
  const [imageError, setImageError] = useState(false);

  const fareResult = calculateRideFare(distanceKm, hasCargo, pricingConfig, companionType);
  const totalPrice = fareResult.total;
  const baseFare = fareResult.motoFare;
  const companionExtra = fareResult.companionExtra;
  const cargoExtra = fareResult.cargoExtra;

  const hasBothPoints = Boolean(origin && destination);
  const viewedCount = viewedDrivers?.length || 0;

  const companionOptions: Array<{ value: CompanionType; label: string; sub: string; extra: number }> = [
    { value: 'none', label: 'Voy solo', sub: 'Solo yo', extra: 0 },
    { value: 'baby', label: 'Con bebé', sub: '0 a 4 años · Gratis', extra: pricingConfig?.baby_extra ?? 0 },
    { value: 'child', label: 'Con niño', sub: '5 a 10 años', extra: pricingConfig?.child_extra ?? 1 },
    { value: 'teen', label: 'Con joven', sub: '11 a 15 años', extra: pricingConfig?.teen_extra ?? 3 },
  ];

  // ═══════════════════════════════════════════════════════════════
  //  ESTADO 1: SIN RUTA
  // ═══════════════════════════════════════════════════════════════
  if (!hasBothPoints) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-slate-950 border-t border-slate-800 rounded-t-3xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-1" />

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 relative">
          <div className="flex flex-col items-center gap-1 my-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <div className="w-0.5 h-7 bg-slate-700" />
            <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
          </div>

          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div onClick={() => onOpenSearch(true)} className="cursor-pointer group">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Punto de Partida</div>
              <div className="text-sm font-semibold text-slate-100 truncate group-hover:text-emerald-400">
                {originAddress || 'Definir punto de recogida...'}
              </div>
            </div>

            <div className="border-t border-slate-800/80" />

            <div className="flex items-center justify-between group gap-2 pr-1">
              <div onClick={() => onOpenSearch(false)} className="cursor-pointer min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Destino</div>
                <div className="text-sm font-semibold text-slate-100 truncate group-hover:text-orange-400">
                  {destinationAddress || '¿A dónde te llevamos?'}
                </div>
              </div>
              {onPickOnMap && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPickOnMap(false); }}
                  className="px-2 py-1 rounded-xl bg-slate-800 text-amber-400 font-bold text-[11px] border border-slate-700"
                >
                  <MapPin className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenSearch(!origin)}
          className="w-full py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700"
        >
          {!origin ? 'Definir Punto de Partida' : 'Seleccionar Punto de Destino'}
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  ESTADO 2: COMPACTO (con ruta, colapsado)
  // ═══════════════════════════════════════════════════════════════
  if (!panelExpanded) {
    return (
      <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-950/95 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => onToggleExpanded(true)}
          className="w-full px-4 py-2 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900 transition border-b border-slate-800/80"
        >
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {onlineDrivers.length} en línea
            </span>
            {viewedCount > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="flex items-center gap-1 text-amber-400">
                  <Eye className="w-3 h-3" />
                  {viewedCount} {viewedCount === 1 ? 'te vio' : 'te vieron'}
                </span>
              </>
            )}
          </div>
          <ChevronUp className="w-4 h-4 text-slate-400" />
        </button>

        <div className="p-3.5 flex items-center gap-3">
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="w-0.5 h-5 bg-slate-700" />
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-slate-300 truncate leading-tight">
              {originAddress || 'Origen'}
            </div>
            <div className="text-[11px] text-slate-300 truncate leading-tight mt-2">
              {destinationAddress || 'Destino'}
            </div>
          </div>

          <button
            onClick={onClearDestination}
            className="w-9 h-9 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/30 flex items-center justify-center transition active:scale-90 shrink-0"
            title="Cancelar ruta y elegir otro destino"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-end gap-1 shrink-0 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300">
              <RouteIcon className="w-3 h-3" />
              {distanceKm} km
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <Clock className="w-3 h-3" />
              ~{durationMins} min
            </div>
            <div className="text-base font-black text-amber-400 leading-none">
              Bs {totalPrice.toFixed(0)}
            </div>
          </div>
        </div>

        <div className="px-3.5 pb-3.5">
          <button
            onClick={() => onRequestRide('moto', totalPrice)}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Bike className="w-4 h-4" />
                Pedir Moto — Bs {totalPrice.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  ESTADO 3: EXPANDIDO
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="mt-auto max-h-[92vh] w-full bg-slate-950 border-t-2 border-slate-700 rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        <button
          onClick={() => onToggleExpanded(false)}
          className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/60"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-1.5 rounded-full bg-slate-700" />
            <span className="text-sm font-black text-white">Informe del viaje</span>
          </div>
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Bloque: Origen y Destino */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                <div className="w-0.5 h-12 bg-slate-700 my-1" />
                <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-3">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Origen</div>
                  <div className="text-sm font-semibold text-white leading-snug">{originAddress || 'Origen'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Destino</div>
                  <div className="text-sm font-semibold text-white leading-snug">{destinationAddress || 'Destino'}</div>
                </div>
              </div>

              <div className="flex flex-col gap-2 self-center shrink-0">
                <button
                  onClick={onSwapLocations}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 transition"
                  title="Invertir origen y destino"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                <button
                  onClick={onClearDestination}
                  className="w-9 h-9 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 flex items-center justify-center border border-rose-500/30 transition active:scale-90"
                  title="Cancelar ruta"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
              Toca <span className="text-rose-400 font-bold">✕</span> para cancelar la ruta actual
            </div>
          </div>

          {/* Bloque: Resumen de ruta */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">Resumen</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <RouteIcon className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-[10px] text-slate-400">Distancia</div>
                  <div className="text-sm font-black text-white">{distanceKm} km</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] text-slate-400">Duración</div>
                  <div className="text-sm font-black text-white">~{durationMins} min</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              {routeSummary}
            </div>
          </div>

          {/* 🆕 Bloque: Acompañante */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                ¿Viajas con alguien?
              </span>
            </div>

            <div className="space-y-2">
              {companionOptions.map(opt => {
                const isSelected = companionType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onCompanionTypeChange(opt.value)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 border transition text-left active:scale-[0.98] ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700/60 text-slate-400'
                    }`}>
                      {opt.value === 'baby' ? <Baby className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 truncate">{opt.sub}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    {opt.extra > 0 && (
                      <span className={`text-[10px] font-bold shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                        +Bs {opt.extra.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 leading-relaxed">
              ⚠️ En la moto solo puede ir 1 acompañante (bebé, niño o joven). No se permite llevar 2 adultos.
            </div>
          </div>

          {/* Bloque: Carga */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100">¿Llevas carga?</div>
                  <div className="text-[11px] text-amber-400 font-semibold">
                    +Bs {(pricingConfig?.cargo_price ?? pricingConfig?.cargo_extra ?? 4).toFixed(2)} fijo
                  </div>
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
                  placeholder="¿Qué llevas? (ej: bolsas, caja pequeña)"
                  className="w-full text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 w-fit">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{cargoPhotoUrl ? 'Cambiar foto' : 'Subir foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => { if (e.target.files?.[0]) onUploadCargoPhoto(e.target.files[0]); }}
                    className="hidden"
                  />
                </label>
                {cargoPhotoUrl && (
                  <img src={cargoPhotoUrl} alt="Carga" className="w-12 h-12 rounded-lg object-cover border border-amber-500" />
                )}
                <div className="text-[10px] text-slate-500 leading-relaxed">
                  📦 Solo se acepta carga que se pueda llevar entre dos manos. Si es muy voluminosa, el conductor puede rechazar el viaje.
                </div>
              </div>
            )}
          </div>

          {/* Bloque: Desglose + Precio total */}
          <div className="bg-gradient-to-r from-amber-500/15 to-slate-900 border border-amber-500/40 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-12 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center overflow-hidden p-0.5 shrink-0">
                {!imageError ? (
                  <img
                    src={motoImageUrl}
                    alt="Moto"
                    className="w-full h-full object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Bike className="w-6 h-6 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total a pagar</div>
                <div className="text-xl font-black text-amber-400">Bs {totalPrice.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-1 pt-3 border-t border-amber-500/20 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>Carrera base</span>
                <span className="font-semibold">Bs {baseFare.toFixed(2)}</span>
              </div>
              {companionExtra > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>
                    Acompañante ({companionType === 'child' ? 'niño' : companionType === 'teen' ? 'joven' : 'bebé'})
                  </span>
                  <span className="font-semibold text-amber-300">+Bs {companionExtra.toFixed(2)}</span>
                </div>
              )}
              {cargoExtra > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Carga</span>
                  <span className="font-semibold text-amber-300">+Bs {cargoExtra.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones inferiores */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex gap-3">
          <button
            onClick={onClearDestination}
            className="px-4 py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 font-bold text-sm border border-rose-500/30 flex items-center justify-center gap-1.5 transition"
            title="Cancelar ruta"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Cancelar</span>
          </button>
          <button
            onClick={() => onRequestRide('moto', totalPrice)}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Bike className="w-4 h-4" />
                Pedir Moto — Bs {totalPrice.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
