import React from 'react';
import { X, MapPin, Check, Star, Sparkles } from 'lucide-react';
import { LatLng } from '../types';

export interface CityOption {
  name: string;
  country: string;
  region?: string;
  coords: LatLng;
  isPrimary?: boolean;
}

// ═══════════════════════════════════════════════════════════════
//  🎯 CIUDADES ACTIVAS — Donde opera Moto Móvil
// ═══════════════════════════════════════════════════════════════
export const ACTIVE_CITIES: CityOption[] = [
  {
    name: 'Montero',
    country: 'Bolivia',
    region: 'Santa Cruz',
    coords: { lat: -17.3389, lng: -63.2556 },
    isPrimary: true
  },
  {
    name: 'Santa Cruz de la Sierra',
    country: 'Bolivia',
    region: 'Santa Cruz',
    coords: { lat: -17.7833, lng: -63.1821 }
  },
  {
    name: 'Warnes',
    country: 'Bolivia',
    region: 'Santa Cruz',
    coords: { lat: -17.5125, lng: -63.1689 }
  },
  {
    name: 'La Guardia',
    country: 'Bolivia',
    region: 'Santa Cruz',
    coords: { lat: -17.9000, lng: -63.2500 }
  },
  {
    name: 'Cochabamba',
    country: 'Bolivia',
    region: 'Cochabamba',
    coords: { lat: -17.3935, lng: -66.1570 }
  },
  {
    name: 'La Paz',
    country: 'Bolivia',
    region: 'La Paz',
    coords: { lat: -16.4897, lng: -68.1193 }
  },
  {
    name: 'Sucre',
    country: 'Bolivia',
    region: 'Chuquisaca',
    coords: { lat: -19.0333, lng: -65.2627 }
  }
];

// ═══════════════════════════════════════════════════════════════
//  🌎 CIUDADES PRÓXIMAS A EXPANDIR
// ═══════════════════════════════════════════════════════════════
export const UPCOMING_CITIES: CityOption[] = [
  { name: 'Lima', country: 'Perú', coords: { lat: -12.0464, lng: -77.0428 } },
  { name: 'Bogotá', country: 'Colombia', coords: { lat: 4.7110, lng: -74.0721 } },
  { name: 'Buenos Aires', country: 'Argentina', coords: { lat: -34.6037, lng: -58.3816 } },
  { name: 'Santiago', country: 'Chile', coords: { lat: -33.4489, lng: -70.6693 } },
  { name: 'Ciudad de México', country: 'México', coords: { lat: 19.4326, lng: -99.1332 } }
];

// Por compatibilidad con código antiguo
export const CITIES_LIST: CityOption[] = [...ACTIVE_CITIES, ...UPCOMING_CITIES];

interface CityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCity: (city: CityOption) => void;
  currentCoords: LatLng | null;
}

export const CityPickerModal: React.FC<CityPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCity,
  currentCoords
}) => {
  if (!isOpen) return null;

  // Detectar qué ciudad está seleccionada actualmente (por proximidad)
  const detectCurrentCity = (): CityOption | null => {
    if (!currentCoords) return null;
    let closest: CityOption | null = null;
    let minDist = Infinity;

    ACTIVE_CITIES.forEach(city => {
      const dLat = currentCoords.lat - city.coords.lat;
      const dLng = currentCoords.lng - city.coords.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < minDist) {
        minDist = dist;
        closest = city;
      }
    });

    // Solo considerar si está a menos de ~0.5 grados (~50 km)
    return minDist < 0.5 ? closest : null;
  };

  const currentCity = detectCurrentCity();

  const handleSelect = (city: CityOption) => {
    onSelectCity(city);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cambiar de Ciudad</h3>
              <p className="text-[11px] text-slate-400">
                {currentCity ? `Estás en ${currentCity.name}` : 'Selecciona tu zona'}
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

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ CIUDAD PRINCIPAL / DESTACADA ═══ */}
          {ACTIVE_CITIES.filter(c => c.isPrimary).map((city) => {
            const isSelected = currentCity?.name === city.name;
            return (
              <div key={city.name} className="p-3 pb-0">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider px-1 mb-2 flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-amber-400" />
                  Ciudad principal
                </div>
                <button
                  onClick={() => handleSelect(city)}
                  className={`w-full p-3.5 rounded-2xl flex items-center gap-3 transition border-2 active:scale-[0.98] ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'bg-gradient-to-br from-amber-500/10 to-slate-900/40 border-amber-500/40 hover:bg-amber-500/15'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg ${
                    isSelected ? 'bg-amber-500 text-slate-950' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    🏙️
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-black text-sm text-white truncate">{city.name}</div>
                    <div className="text-[11px] text-amber-400/80 font-semibold">
                      {city.region ? `${city.region}, ` : ''}{city.country}
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 shrink-0">
                      ACTUAL
                    </span>
                  ) : (
                    <Check className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>
              </div>
            );
          })}

          {/* ═══ CIUDADES ACTIVAS ═══ */}
          <div className="p-3">
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ciudades activas en Bolivia
            </div>
            <div className="space-y-1.5">
              {ACTIVE_CITIES.filter(c => !c.isPrimary).map((city) => {
                const isSelected = currentCity?.name === city.name;
                return (
                  <button
                    key={city.name}
                    onClick={() => handleSelect(city)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition border text-left active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/60 text-slate-400'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{city.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {city.region ? `${city.region}, ` : ''}{city.country}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ PRÓXIMAMENTE ═══ */}
          <div className="p-3 pt-0">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Próximamente en Latinoamérica
            </div>
            <div className="flex flex-wrap gap-1.5">
              {UPCOMING_CITIES.map((city) => (
                <div
                  key={city.name}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/60 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 cursor-not-allowed opacity-60"
                  title="Próximamente"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  {city.name}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-center">
          <p className="text-[10px] text-slate-500">
            ¿No está tu ciudad? Pronto nos expandiremos 🚀
          </p>
        </div>
      </div>
    </div>
  );
};
