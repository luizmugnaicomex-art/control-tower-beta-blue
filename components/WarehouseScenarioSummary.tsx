
import React from "react";
import { RoutePrice, Carrier, CarrierId } from "../types";

interface WarehouseScenarioSummaryProps {
  routes: RoutePrice[];
  carriers: Carrier[];
  quantity: number;
}

export function WarehouseScenarioSummary({ routes, carriers, quantity }: WarehouseScenarioSummaryProps) {
  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getScenario = (rowId: string, label: string) => {
    const route = routes.find((r) => r.id === rowId);
    if (!route) return null;

    const ranking = carriers
      .map((c) => ({
        id: c.id,
        name: c.name,
        price: (route.prices[c.id] || 0) * quantity,
      }))
      .filter((item) => item.price > 0)
      .sort((a, b) => a.price - b.price);

    if (ranking.length === 0) return null;

    const winner = ranking[0];

    return (
      <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="material-icons text-amber-500">military_tech</span>
          {label} Ranking (Qty: {quantity})
        </h4>
        <div className="space-y-3">
          {ranking.map((item, idx) => {
            const gapPrice = item.price - winner.price;
            const gapPct = winner.price > 0 ? (gapPrice / winner.price) * 100 : 0;
            const isWinner = idx === 0;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-xl p-3 transition-all ${
                  isWinner ? "bg-white shadow-sm ring-1 ring-emerald-500" : "bg-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    isWinner ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.name}</p>
                    {!isWinner && (
                      <p className="text-[10px] text-red-500">
                        +{formatCurrency(gapPrice)} (+{gapPct.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>
                <p className={`text-sm font-black ${isWinner ? "text-emerald-600" : "text-slate-700"}`}>
                  {formatCurrency(item.price)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Warehouse Scenario Ranking</h2>
          <p className="text-xs text-gray-500 italic">Impact of {quantity} container(s) on 15 and 30 day total storage costs.</p>
        </div>
        <div className="rounded-full bg-red-100 px-4 py-1 text-[10px] font-bold uppercase text-red-700">
          Global Qty Control: {quantity}
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        {getScenario("W_15D", "15-Day Scenario")}
        {getScenario("W_30D", "30-Day Scenario")}
      </div>
    </section>
  );
}
