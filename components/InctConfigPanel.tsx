
import React from "react";
import { INCTConfig } from "../types";

interface InctConfigPanelProps {
  inct: INCTConfig;
  onInctChange: (field: string, value: string) => void;
}

export function InctConfigPanel({ inct, onInctChange }: InctConfigPanelProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-slate-50/50 p-6 print:hidden">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-icons text-gray-400">settings_suggest</span>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Benchmark Parameters (INCT)</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-600">INCTL - Full Load (12m) %</label>
          <input
            type="number"
            step="0.01"
            value={inct.inctLotacao}
            onChange={(e) => onInctChange("inctLotacao", e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-900 transition-all focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-600">INCTF - Fragmented (12m) %</label>
          <input
            type="number"
            step="0.01"
            value={inct.inctFracionado}
            onChange={(e) => onInctChange("inctFracionado", e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-900 transition-all focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-600">Market Gap Alert %</label>
          <input
            type="number"
            step="1"
            value={inct.alertaAcimaPct}
            onChange={(e) => onInctChange("alertaAcimaPct", e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-bold text-gray-900 transition-all focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-50"
          />
        </div>
      </div>
    </section>
  );
}
