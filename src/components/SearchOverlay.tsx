import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Clock, MapPin, X, Store, Hospital, Building2, Fuel, ShoppingBag } from 'lucide-react';
import { LatLng, PointOfInterest } from '../types';
import { searchPlaces } from '../services/geocodingService';
import { POPULAR_LANDMARKS } from '../data/landmarks';

interface SearchOverlayProps {
  isOpen: boolean;
  isPickingOrigin: boolean;
  currentCoords: LatLng | null;
  recentSearches: Array<{ name: string; address: string; lat: number; lng: number }>;
  onClose: () => void;
  onSelectLocation: (loc: { name: string; address: string; lat: number; lng: number }) => void;
  onPickOnMap: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  isPickingOrigin,
  currentCoords,
  recentSearches,
  onClose,
  onSelectLocation,
  onPickOnMap
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ name: string; address: string; lat: number; lng: number; category?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setActiveCategory(null);
      return;
    }
  }, [isOpen]);

  // Handle Query Changes with Debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const res = await searchPlaces(query, currentCoords || undefined);
      setResults(res);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentCoords]);

  // Handle Category Quick Filter
  const handleCategoryClick = (cat: string) => {
    if (activeCategory === cat) {
      setActiveCategory(null);
      setResults([]);
    } else {
      setActiveCategory(cat);
      const filtered = POPULAR_LANDMARKS.filter(p => p.category === cat).map(p => ({
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        category: p.category
      }));
      setResults(filtered);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-slate-100 animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-base font-bold text-white">
            {isPickingOrigin ? 'Buscar Punto de Partida' : 'Buscar Destino'}
          </h2>
          <p className="text-xs text-slate-400">
            Escribe un lugar, mercado, hospital o calle conocida
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-5 h-5 text-amber-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isPickingOrigin ? "¿Dónde te recogemos? Ej: Plaza 24, Mercado Abasto..." : "¿A dónde vas? Ej: Ventura Mall, Hospital Japonés..."}
            autoFocus
            className="w-full pl-11 pr-10 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition shadow-inner"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Pick Reference Categories */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleCategoryClick('mercado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
              activeCategory === 'mercado' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Store className="w-3.5 h-3.5" /> Mercados
          </button>
          <button
            onClick={() => handleCategoryClick('hospital')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
              activeCategory === 'hospital' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" /> Hospitales
          </button>
          <button
            onClick={() => handleCategoryClick('mall')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
              activeCategory === 'mall' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Centros Comerciales
          </button>
          <button
            onClick={() => handleCategoryClick('gasolinera')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
              activeCategory === 'gasolinera' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Fuel className="w-3.5 h-3.5" /> Gasolineras
          </button>
        </div>
      </div>

      {/* Action to Pick on Map directly */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80">
        <button
          onClick={onPickOnMap}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-400 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700/60 transition"
        >
          <MapPin className="w-4 h-4" />
          Fijar directamente en el mapa (mira interactiva)
        </button>
      </div>

      {/* Content Area: Results or Recent */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
        {isLoading && (
          <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            Buscando referencias y calles en tiempo real...
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="p-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
              Puntos de Referencia Encontrados
            </div>
            {results.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onSelectLocation(item)}
                className="p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-start gap-3 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                  <div className="text-xs text-slate-400 truncate">{item.address}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && query.trim() && (
          <div className="p-8 text-center text-slate-400 text-sm">
            No se encontraron coincidencias para "{query}". Puedes pulsar "Fijar directamente en el mapa".
          </div>
        )}

        {!query.trim() && !activeCategory && (
          <div className="p-2">
            {recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Búsquedas Recientes
                </div>
                {recentSearches.map((rec, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectLocation(rec)}
                    className="p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-start gap-3 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{rec.name}</div>
                      <div className="text-xs text-slate-400 truncate">{rec.address}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
                Lugares Populares y Puntos Clave
              </div>
              {POPULAR_LANDMARKS.slice(0, 6).map((poi) => (
                <div
                  key={poi.id}
                  onClick={() => onSelectLocation({
                    name: poi.name,
                    address: poi.address,
                    lat: poi.lat,
                    lng: poi.lng
                  })}
                  className="p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-start gap-3 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{poi.name}</div>
                    <div className="text-xs text-slate-400 truncate">{poi.address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
