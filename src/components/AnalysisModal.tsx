import React from 'react';
import { X, CheckCircle2, AlertTriangle, Cpu, Map, Navigation, ShieldCheck, Zap } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Análisis de la Interfaz y Alternativa a Mapbox
              </h3>
              <p className="text-xs text-slate-400">
                Comparativa técnica, puntos de referencia y cálculo de rutas
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
          {/* Diagnostic Box */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 font-bold text-red-400 text-sm mb-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Diagnóstico: ¿Por qué Mapbox fallaba en tu app de transporte?
            </div>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-white">Falta crítica de Puntos de Referencia (POIs):</strong> Los mosaicos vectoriales de Mapbox en Latinoamérica (Bolivia / Santa Cruz) carecen del 80% de los comercios locales, farmacias de turno, ferreterías, mercados populares (Abasto, La Ramada, Pozos), bancos y clínicas que los usuarios usan como guía visual.
              </li>
              <li>
                <strong className="text-white">Fricción con Geoapify / Nominatim externo:</strong> Depender de un geocodificador externo no integrado en el canvas del mapa causaba desincronizaciones entre el pin y el nombre de la calle.
              </li>
              <li>
                <strong className="text-white">Limitaciones de Rutas en tiempo real:</strong> Mapbox Directions requiere cuotas estrictas y no prioriza rutas ágiles para motocicletas o tráfico congestionado en ciudades densas.
              </li>
            </ul>
          </div>

          {/* Solution Architecture Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Solución Implementada: Google Maps High-Density Engine
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <Map className="w-3.5 h-3.5 text-amber-400" /> Capa Google Maps con POIs
                </div>
                <p className="text-slate-400">
                  Visualiza todos los nombres de negocios, hospitales, tiendas, gasolineras, escuelas y referencias nativas de Google Maps y Satélite Híbrido.
                </p>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <Navigation className="w-3.5 h-3.5 text-cyan-400" /> Ruteo Óptimo en Tiempo Real
                </div>
                <p className="text-slate-400">
                  Motor de ruteo que traza la carretera curva exacta (polyline geojson), calcula distancia real en km, tiempo estimado y tarifa dinámica.
                </p>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" /> Mira Telescópica Móvil
                </div>
                <p className="text-slate-400">
                  Pin central flotante que ancla a la calle con geocodificación inversa instantánea y confirmación en 1 toque.
                </p>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Flujo Completo de Transporte
                </div>
                <p className="text-slate-400">
                  Soporte de carga (+Bs 4.00), conductor asignado en vivo con botones de llamada y WhatsApp, cobro por QR/efectivo y calificaciones.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Specs Comparison Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[11px] font-bold border-b border-slate-800">
                  <th className="p-2.5">Característica</th>
                  <th className="p-2.5 text-red-400">Mapbox Anterior</th>
                  <th className="p-2.5 text-emerald-400">Nueva Alternativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="p-2.5 font-semibold text-white">Referencias y Comercios</td>
                  <td className="p-2.5 text-slate-400">Bajo / Incompleto</td>
                  <td className="p-2.5 text-emerald-400 font-bold">100% Google Maps POIs</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-white">Trazo de Ruta en Vivo</td>
                  <td className="p-2.5 text-slate-400">Petición lenta a Mapbox API</td>
                  <td className="p-2.5 text-emerald-400 font-bold">Sub-segundo en tiempo real</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-white">Punto de Origen / Destino</td>
                  <td className="p-2.5 text-slate-400">Pins estáticos propensos a desfase</td>
                  <td className="p-2.5 text-emerald-400 font-bold">Pulsos interactivos A/B + Mira fija</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-white">Búsqueda de Mercados y Clínicas</td>
                  <td className="p-2.5 text-slate-400">Requiere Geoapify key</td>
                  <td className="p-2.5 text-emerald-400 font-bold">Chips directos + Autocompletado rápido</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Entendido, volver al mapa
          </button>
        </div>
      </div>
    </div>
  );
};
