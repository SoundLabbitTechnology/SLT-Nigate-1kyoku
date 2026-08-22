import React from 'react';
import { Reaction } from '../types';

interface FloatingReactionsProps {
  reactions: Reaction[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r, i) => {
        // Deterministic offset based on ID hash
        const offset = ((r.id.charCodeAt(r.id.length - 1) * 37) % 70) + 15;
        return (
          <div
            key={r.id}
            style={{ left: `${offset}%` }}
            className="absolute bottom-10 animate-bounce duration-1000 flex flex-col items-center select-none"
          >
            <div className="text-4xl sm:text-5xl filter drop-shadow-md animate-in fade-in slide-in-from-bottom-8 duration-700">
              {r.emoji}
            </div>
            <span className="text-[10px] font-black bg-[#38312E] text-white px-2 py-0.5 rounded-full border border-white mt-1 opacity-85 shadow">
              {r.senderName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
