import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  driverName: string;
  onSubmitRating: (rating: number) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  driverName,
  onSubmitRating
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
        <h3 className="text-xl font-black text-white">¿Cómo estuvo tu viaje?</h3>
        <p className="text-xs text-slate-400 mt-1">
          Califica tu experiencia con el conductor <span className="text-amber-400 font-bold">{driverName}</span>
        </p>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 my-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="p-1 transform transition hover:scale-125 active:scale-95"
            >
              <Star
                className={`w-9 h-9 ${
                  (hoverRating || rating) >= star
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-700'
                }`}
              />
            </button>
          ))}
        </div>

        <button
          onClick={() => onSubmitRating(rating)}
          className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-98"
        >
          <Send className="w-4 h-4" />
          Enviar Calificación
        </button>
      </div>
    </div>
  );
};
