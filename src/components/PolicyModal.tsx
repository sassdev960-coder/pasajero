import React, { useState } from 'react';
import { Shield, ExternalLink, CheckCircle2, AlertTriangle, FileText, Trash2 } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
}

const PRIVACY_URL = 'https://sassdev960-coder.github.io/pasajero/PRIVACY_POLICY';
const DELETE_URL = 'https://sassdev960-coder.github.io/pasajero/DELETE_ACCOUNT';

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onAccept }) => {
  const [accepted, setAccepted] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (!accepted) return;
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-base font-black text-white leading-tight">
            Antes de comenzar
          </h1>
          <p className="text-[11px] text-slate-400">
            Moto Móvil El Campeón — Privacidad y datos
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Intro */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs leading-relaxed text-slate-300">
          Para ofrecerte el servicio de transporte en moto, <strong className="text-white">Moto Móvil El Campeón</strong> necesita
          recopilar y procesar ciertos datos personales. Queremos que sepas exactamente qué datos usamos y para qué.
        </div>

        {/* Resumen rápido */}
        <div className="space-y-2">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                Datos que recopilamos
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed pl-1">
              <li>📍 <strong className="text-white">Ubicación precisa</strong> — para calcular rutas y tarifas.</li>
              <li>👤 <strong className="text-white">Nombre y CI</strong> — para identificarte ante el conductor.</li>
              <li>📞 <strong className="text-white">Teléfono</strong> — para que el conductor te contacte.</li>
              <li>📷 <strong className="text-white">Fotos</strong> (opcional) — perfil y carga.</li>
              <li>📊 <strong className="text-white">Uso de la app</strong> — para mejorar el servicio.</li>
            </ul>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                Tus derechos
              </span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed pl-1">
              <li>✅ Puedes <strong className="text-white">acceder</strong> a tus datos en cualquier momento.</li>
              <li>✅ Puedes <strong className="text-white">editar</strong> tu perfil desde la app.</li>
              <li>✅ Puedes <strong className="text-white">eliminar tu cuenta</strong> y todos tus datos.</li>
              <li>✅ Nunca vendemos tu información a terceros.</li>
            </ul>
          </div>
        </div>

        {/* Enlaces a documentos */}
        <div className="space-y-2">
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60 hover:border-amber-500/40 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Política de Privacidad</div>
                <div className="text-[11px] text-slate-400">Consulta cómo manejamos tus datos</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
          </a>

          <a
            href={DELETE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60 hover:border-red-500/40 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Eliminar mi cuenta y datos</div>
                <div className="text-[11px] text-slate-400">Cómo solicitar el borrado completo</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition" />
          </a>
        </div>

        {/* Aviso importante */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-[11px] text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 block mb-0.5">Aviso de ubicación</strong>
            La app recopila tu ubicación <strong>incluso en segundo plano</strong> durante un viaje activo,
            para que el conductor pueda encontrarte y para calcular la ruta y tarifa.
            Puedes revocar este permiso desde los ajustes de tu teléfono, pero la app no funcionará sin él.
          </div>
        </div>
      </div>

      {/* Footer con checkbox y botón */}
      <div className="p-5 border-t border-slate-800 bg-slate-900 space-y-3">

        <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition">
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="peer sr-only"
            />
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
              accepted ? 'bg-amber-500 border-amber-500' : 'border-slate-600'
            }`}>
              {accepted && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />}
            </div>
          </div>
          <span className="text-xs text-slate-300 leading-relaxed">
            He leído y acepto la <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-amber-400 font-bold underline">Política de Privacidad</a> y
            autorizo el uso de mi ubicación para el funcionamiento del servicio.
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={!accepted}
          className={`w-full py-4 rounded-2xl font-black text-sm transition active:scale-[0.98] ${
            accepted
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xl shadow-amber-500/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {accepted ? 'Aceptar y continuar' : 'Marca la casilla para continuar'}
        </button>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Si no aceptas, no podrás usar la aplicación. Puedes cerrarla y volver más tarde.
        </p>
      </div>
    </div>
  );
};
