import React, { useState } from "react";
import { Carrier, CarrierSummary, INCTConfig, CarrierId, RouteMetric, RoutePrice } from "../types";

interface CarrierCardsProps {
  carriers: Carrier[];
  carrierSummary: Record<CarrierId, CarrierSummary>;
  routeMetrics: RouteMetric[];
  routes: RoutePrice[];
  inct: INCTConfig;
  justifications: Record<string, string>;
  onJustificationChange: (id: CarrierId, val: string) => void;
}

export function CarrierCards({
  carriers,
  carrierSummary,
  routeMetrics,
  routes,
  inct,
  justifications,
  onJustificationChange,
}: CarrierCardsProps) {
  const [showBreakdown, setShowBreakdown] = useState<CarrierId | null>(null);

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <section className="print:mt-8">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900">
        <span className="material-icons text-red-600">assessment</span>
        Supplier Performance & Technical Justification
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {carriers.map((carrier) => {
          const summary = carrierSummary[carrier.id];
          if (!summary || summary.count === 0) return null;

          const avgDiff = summary.avgDiffPct;
          const isCompetitive = avgDiff != null && avgDiff <= inct.inctLotacao;
          const isNeutral = avgDiff != null && avgDiff <= inct.alertaAcimaPct;

          const statusColor = isCompetitive
            ? "text-emerald-600 border-emerald-200 bg-emerald-50"
            : isNeutral
            ? "text-amber-600 border-amber-200 bg-amber-50"
            : "text-red-600 border-red-200 bg-red-50";

          return (
            <div
              key={carrier.id}
              className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                isCompetitive ? "ring-2 ring-emerald-500 shadow-emerald-100" : "border-gray-200"
              }`}
            >
              {isCompetitive && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase text-white">
                  Recommended
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">{carrier.name}</h3>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${statusColor}`}>
                  {isCompetitive ? "Competitive" : isNeutral ? "Neutral" : "High Gap"}
                </span>
              </div>

              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Avg. Deviation</p>
                  <p className={`text-2xl font-black ${isCompetitive ? 'text-emerald-600' : isNeutral ? 'text-amber-600' : 'text-red-600'}`}>
                    {avgDiff != null ? `+${avgDiff.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <button
                  onMouseEnter={() => setShowBreakdown(carrier.id)}
                  onMouseLeave={() => setShowBreakdown(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 print:hidden"
                >
                  <span className="material-icons text-lg">info</span>
                </button>
              </div>

              {/* ESTIMATION BOX */}
              <div className="mb-5 rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Estimated Total Spend</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(summary.estimatedTotal)}
                </p>
                <p className="text-[9px] text-slate-500 italic">Based on active quantity</p>
              </div>

              {showBreakdown === carrier.id && (
                <div className="absolute left-0 top-0 z-50 h-full w-full bg-white/95 p-4 shadow-xl backdrop-blur-sm transition-opacity">
                  <p className="mb-2 text-xs font-bold text-gray-900 underline">Calculation Breakdown</p>
                  <p className="mb-3 text-[10px] italic text-gray-500">Formula: Σ((Carrier Price - Min Price) / Min Price) / Count</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {routes.map((route) => {
                      const metric = routeMetrics.find((m) => m.routeId === route.id);
                      const diff = metric?.diffPctByCarrier[carrier.id];
                      if (diff == null) return null;
                      return (
                        <div key={route.id} className="flex justify-between border-b border-gray-100 pb-1 text-[10px]">
                          <span className="truncate pr-2 text-gray-600">{route.description}</span>
                          <span className="font-bold text-gray-900">+{diff.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-2 text-center text-[10px] font-bold">
                    Result: {avgDiff?.toFixed(1)}% average gap
                  </div>
                </div>
              )}

              {/* Fix: Corrected label closing tag from </ts-label> to </label> on line 119 */}
              <label className="mb-2 block text-[10px] font-bold uppercase text-gray-400">Technical Justification</label>
              <textarea
                value={justifications[carrier.id] || ""}
                onChange={(e) => onJustificationChange(carrier.id, e.target.value)}
                placeholder="Compliance note: justify why this vendor is used despite cost gap (e.g., SLA, safety, equipment)."
                className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700 transition-all focus:border-red-400 focus:bg-white focus:outline-none print:border-none print:bg-transparent"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}