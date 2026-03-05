
import React from "react";
import { RoutePrice, Carrier, RouteMetric, INCTConfig, CarrierId } from "../types";

interface RoutesTableProps {
  routes: RoutePrice[];
  carriers: Carrier[];
  routeMetrics: RouteMetric[];
  inct: INCTConfig;
  onPriceChange: (routeId: string, carrierId: CarrierId, value: string) => void;
  showDistance?: boolean;
}

export function RoutesTable({
  routes,
  carriers,
  routeMetrics,
  inct,
  onPriceChange,
  showDistance = true,
}: RoutesTableProps) {
  const formatCurrency = (val: number | null) =>
    val != null ? val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-";

  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-gray-900 flex items-center gap-2">
        <span className="material-icons text-red-600">list_alt</span>
        Price Comparison by Route
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="px-6 py-4 font-bold text-slate-500">Route / Description</th>
              {showDistance && <th className="px-4 py-4 font-bold text-slate-500 text-center">KM</th>}
              {carriers.map((c) => (
                <th key={c.id} className="px-4 py-4 font-bold text-slate-500 text-right min-w-[140px]">
                  {c.name}
                </th>
              ))}
              <th className="px-6 py-4 font-bold text-slate-900 text-right">Best Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {routes.map((route) => {
              const metrics = routeMetrics.find((rm) => rm.routeId === route.id);
              return (
                <tr key={route.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{route.description}</td>
                  {showDistance && (
                    <td className="px-4 py-4 text-center text-gray-500 font-medium">
                      {route.distanceKm || "-"}
                    </td>
                  )}
                  {carriers.map((c) => {
                    const price = route.prices[c.id];
                    const diff = metrics?.diffPctByCarrier[c.id];
                    const isMin = metrics?.minPrice != null && price != null && Math.abs(price - metrics.minPrice) < 0.01;

                    return (
                      <td
                        key={c.id}
                        className={`px-4 py-4 text-right transition-all ${
                          isMin ? "bg-emerald-50/50" : ""
                        }`}
                      >
                        <div className="flex flex-col items-end gap-1">
                          <div className="relative w-full">
                            <input
                              type="number"
                              step="0.01"
                              value={price ?? ""}
                              onChange={(e) => onPriceChange(route.id, c.id, e.target.value)}
                              className={`w-full rounded-lg border bg-white px-3 py-1.5 text-right font-medium transition-all focus:outline-none focus:ring-2 ${
                                isMin
                                  ? "border-emerald-300 text-emerald-700 focus:ring-emerald-200"
                                  : "border-gray-200 text-gray-700 focus:ring-red-100"
                              }`}
                            />
                            {isMin && (
                              <div className="pointer-events-none absolute -top-2 -right-1 flex h-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[8px] font-bold text-white shadow-sm ring-1 ring-white">
                                <span className="material-icons text-[10px]">emoji_events</span>
                              </div>
                            )}
                          </div>
                          {diff != null && price != null && !isMin && (
                            <span
                              className={`text-[10px] font-bold ${
                                diff <= inct.inctLotacao
                                  ? "text-emerald-600"
                                  : diff <= inct.alertaAcimaPct
                                  ? "text-amber-600"
                                  : "text-red-500"
                              }`}
                            >
                              +{diff.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    {formatCurrency(metrics?.minPrice || null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
