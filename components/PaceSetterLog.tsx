
import React from 'react';
import { PaceUpdate } from '../types';

interface PaceSetterLogProps {
  updates: PaceUpdate[];
}

export const PaceSetterLog: React.FC<PaceSetterLogProps> = ({ updates }) => {
  const current = updates[updates.length - 1];

  return (
    <div className="bg-gray-950 text-green-400 p-3 rounded-lg shadow-xl flex-1 flex flex-col font-mono text-[10px] overflow-hidden border border-green-900/30">
      <div className="flex justify-between items-center mb-2 border-b border-green-900/20 pb-1.5 shrink-0">
        <h2 className="font-bold uppercase tracking-widest flex items-center gap-1.5 text-green-500/80">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
          Pace Setter
        </h2>
        {current && (
          <span className="bg-green-900/20 px-1 py-0.5 rounded border border-green-700/30 text-[9px] text-green-300">
            {(current.targetLanguageRatio * 100).toFixed(0)}% Target
          </span>
        )}
      </div>

      <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {updates.length === 0 ? (
          <div className="h-full flex items-center justify-center text-green-900/50 text-center italic text-[9px] p-2">
            Monitoring fluency...
          </div>
        ) : (
          updates.slice().reverse().map((update, idx) => (
            <div key={idx} className="border-l border-green-900/30 pl-2 py-0.5 space-y-0.5 animate-fade-in">
              <div className="text-[8px] text-green-800">
                [{new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </div>
              <div className="leading-tight text-green-400/90">
                <span className="text-green-700 font-bold uppercase text-[8px]">Eval:</span> {update.evaluation}
              </div>
              <div className="text-gray-500 leading-tight">
                <span className="text-blue-900/80 font-bold uppercase text-[8px]">Plan:</span> {update.strategy}
              </div>
            </div>
          ))
        )}
      </div>
      
      {current && (
        <div className="mt-2 pt-1.5 border-t border-green-900/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-green-900 text-[8px] uppercase font-bold shrink-0">Flow</span>
            <div className="flex-grow bg-green-950 border border-green-900/30 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_5px_rgba(34,197,94,0.3)]" 
                style={{ width: `${current.targetLanguageRatio * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
