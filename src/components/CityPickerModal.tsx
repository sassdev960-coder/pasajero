import React from 'react';
import { X, MapPin, Check } from 'lucide-react';
import { LatLng } from '../types';

export interface CityOption {
  name: string;
  country: string;
  coords: LatLng;
}

export const CITIES_LIST: CityOption[] = [
  { name: 'Santa Cruz de la Sierra', country: 'Bolivia', coords: { lat: -17.7833, lng: -63.1821 } },
  { name: 'La Paz', country: 'Bolivia', coords: { lat: -16.4897, lng: -68.1193 } },
  { name: 'Cochabamba', country: 'Bolivia', coords: { lat: -17.3935, lng: -66.1570 } },
  { name: 'Lima', country: 'Perú', coords: { lat: -12.0464, lng: -77.0428 } },
  { name: 'Bogotá', country: 'Colombia', coords: { lat: 4.7110, lng: -74.0721 } },
  { name: 'Buenos Aires', country: 'Argentina', coords: { lat: -34.6037, lng: -58.3816 } },
  { name: 'Santiago', country: 'Chile', coords: { lat: -33.4489, lng: -70.6693 } },
  { name: 'Ciudad de México', country: 'México', coords: { lat: 19.4326, lng: -99.1332 } }
];

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Cambiar de Ciudad</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 text-xs text-slate-400">
          Si deseas cambiar de ciudad o tu navegador no tiene GPS activo, selecciona una zona:
        </div>

        <div className="flex-1 overflow-y-auto max-h-[60vh] p-2 divide-y divide-slate-800/60">
          {CITIES_LIST.map((c) => {
            const isSelected = currentCoords && 
              Math.abs(currentCoords.lat - c.coords.lat) < 0.05 && 
              Math.abs(currentCoords.lng - c.coords.lng) < 0.05;

            return (
              <div
                key={c.name}
                onClick={() => {
                  onSelectCity(c);
                  onClose();
                }}
                className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition ${
                  isSelected ? 'bg-amber-500/10 text-amber-400' : 'hover:bg-slate-800/70 text-slate-200'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.country}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-amber-400" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
