import React from 'react';
import { QrCode, Banknote, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  price: number;
  onConfirmPayment: (method: 'qr' | 'efectivo') => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  price,
  onConfirmPayment
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-black text-white">¡Llegaste a tu destino!</h3>
        <p className="text-xs text-slate-400 mt-1">
          Total a cancelar por el servicio de Moto Campeón:
        </p>

        <div className="my-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl">
          <span className="text-3xl font-black text-amber-400">
            Bs {price.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => onConfirmPayment('qr')}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm flex items-center justify-center gap-3 border border-slate-700 transition active:scale-98"
          >
            <QrCode className="w-5 h-5 text-amber-400" />
            Pagar con QR Simple (Transferencia)
          </button>

          <button
            onClick={() => onConfirmPayment('efectivo')}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm flex items-center justify-center gap-3 border border-slate-700 transition active:scale-98"
          >
            <Banknote className="w-5 h-5 text-emerald-400" />
            Pagar en Efectivo
          </button>
        </div>
      </div>
    </div>
  );
};
