
import React, { useMemo, useState } from "react";
import { RoutePrice, RouteMetric, ProvisionSettings, CarrierId, Shipment } from "../types";

interface TransportEstimativeProps {
  routes: RoutePrice[];
  routeMetrics: RouteMetric[];
  warehouseRoutes: RoutePrice[];
  provision: ProvisionSettings;
  historicalShipments: Shipment[];
  onUpdate: (updates: Partial<ProvisionSettings>) => void;
  onRouteQtyUpdate: (id: string, qty: number) => void;
}

interface EstimativeRow {
  month: string;
  warehouse: string;
  carrier: string;
  qty: number;
  rate: number;
  previsto: number;
  realizado: number;
  delta: number;
  deltaPct: number;
}

interface CarrierTotal {
  name: string;
  totalPrevisto: number;
  totalRealizado: number;
  qty: number;
  isUnknown: boolean;
}

export function TransportEstimative({
  routes,
  routeMetrics,
  historicalShipments,
}: TransportEstimativeProps) {
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string | null>(null);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // 1. Generate the base grouped data from historical shipments
  const allRows = useMemo(() => {
    const groups: Record<string, EstimativeRow> = {};

    historicalShipments.forEach((s) => {
      const date = s.deliveryByd || s.ata;
      if (!date) return;

      const monthLabel = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const warehouse = s.bondedWarehouse || "Terminal Not Identified";
      
      // Clean up carrier name: "Unknown" or "" becomes a clearer label
      let carrier = s.carrier || "Carrier Not Identified";
      if (carrier === "Unknown") carrier = "Carrier Not Identified";
      
      const key = `${monthLabel}|${warehouse}|${carrier}`;

      if (!groups[key]) {
        // Map Warehouse to Benchmark Route
        const bwUpper = warehouse.toUpperCase();
        let routeId = "TECON_FACTORY"; // Default
        if (bwUpper.includes("INTERMAR")) routeId = "INTERMAR_FACTORY";
        else if (bwUpper.includes("TPC")) routeId = "TPC_FACTORY";
        else if (bwUpper.includes("CLIA") || bwUpper.includes("EMPORIO")) routeId = "CLIA_FACTORY";

        const route = routes.find(r => r.id === routeId);
        const metric = routeMetrics.find(m => m.routeId === routeId);
        
        // Match specific carrier price from benchmark
        const carrierKey = carrier.toUpperCase();
        let benchmarkRate = metric?.minPrice || 0;
        
        if (route) {
          if (carrierKey.includes("TPC")) benchmarkRate = route.prices["TPC"] || benchmarkRate;
          else if (carrierKey.includes("INTERMAR")) benchmarkRate = route.prices["INTERMARITIMA"] || benchmarkRate;
          else if (carrierKey.includes("CLIA")) benchmarkRate = route.prices["CLIA_EMP"] || benchmarkRate;
          else if (carrierKey.includes("RECOM")) benchmarkRate = route.prices["RECOM"] || benchmarkRate;
          else if (carrierKey.includes("CTS") || carrierKey.includes("MED")) benchmarkRate = route.prices["CTS_MEDLOG"] || benchmarkRate;
          else if (carrierKey.includes("TRANS")) benchmarkRate = route.prices["TRANSPARANA"] || benchmarkRate;
          else if (carrierKey.includes("TEGMA")) benchmarkRate = route.prices["TEGMA"] || benchmarkRate;
        }

        groups[key] = {
          month: monthLabel,
          warehouse,
          carrier,
          qty: 0,
          rate: benchmarkRate,
          previsto: 0,
          realizado: 0,
          delta: 0,
          deltaPct: 0
        };
      }

      const g = groups[key];
      g.qty += 1;
      g.realizado += (s.totalCost || 0);
    });

    return Object.values(groups).map(g => {
      g.previsto = g.qty * g.rate;
      g.delta = g.realizado - g.previsto;
      g.deltaPct = g.previsto > 0 ? (g.delta / g.previsto) * 100 : 0;
      return g;
    });
  }, [historicalShipments, routes, routeMetrics]);

  // 2. Calculate Totals Per Carrier for the Filter Cards
  const carrierSummaries = useMemo(() => {
    const summary: Record<string, CarrierTotal> = {};
    allRows.forEach(row => {
      if (!summary[row.carrier]) {
        summary[row.carrier] = { 
          name: row.carrier, 
          totalPrevisto: 0, 
          totalRealizado: 0, 
          qty: 0,
          isUnknown: row.carrier === "Carrier Not Identified"
        };
      }
      summary[row.carrier].totalPrevisto += row.previsto;
      summary[row.carrier].totalRealizado += row.realizado;
      summary[row.carrier].qty += row.qty;
    });
    return Object.values(summary).sort((a, b) => {
        if (a.isUnknown) return 1; // Put unknowns at the end
        if (b.isUnknown) return -1;
        return b.totalPrevisto - a.totalPrevisto;
    });
  }, [allRows]);

  // 3. Filter data based on selection
  const filteredRows = useMemo(() => {
    if (!selectedCarrierFilter) return allRows.sort((a, b) => b.qty - a.qty);
    return allRows
      .filter(r => r.carrier === selectedCarrierFilter)
      .sort((a, b) => b.qty - a.qty);
  }, [allRows, selectedCarrierFilter]);

  const totals = useMemo(() => {
    return filteredRows.reduce((acc, curr) => ({
      previsto: acc.previsto + curr.previsto,
      realizado: acc.realizado + curr.realizado,
      qty: acc.qty + curr.qty
    }), { previsto: 0, realizado: 0, qty: 0 });
  }, [filteredRows]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* Financial Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-100">
               <span className="material-icons text-white text-3xl">account_balance</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Transport Estimative</h2>
              <p className="text-slate-400 text-sm mt-2 font-medium">Financial provisioning based on benchmarked truck rates.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Provision Status</p>
              <p className="text-xl font-black text-slate-500">Analysis Active</p>
           </div>
           <div className="h-14 w-[2px] bg-slate-100 rounded-full"></div>
           <div className="bg-slate-900 text-white px-6 py-4 rounded-[1.5rem] shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total CNTR</p>
              <p className="text-2xl font-black tracking-tighter">{totals.qty}</p>
           </div>
        </div>
      </div>

      {/* Carrier Selection Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-3">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="material-icons text-base">filter_list</span>
                Filter by Truck Company
              </h3>
              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                 <span className="material-icons text-[12px]">info</span>
                 Check "Carrier Not Identified" for file gaps
              </div>
           </div>
           {selectedCarrierFilter && (
             <button 
               onClick={() => setSelectedCarrierFilter(null)}
               className="text-[10px] font-black text-red-600 uppercase hover:underline"
             >
               Clear Selection
             </button>
           )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
           {carrierSummaries.map((c) => (
             <button
               key={c.name}
               onClick={() => setSelectedCarrierFilter(selectedCarrierFilter === c.name ? null : c.name)}
               className={`relative p-6 rounded-[2rem] border transition-all text-left group ${
                 selectedCarrierFilter === c.name 
                 ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-100 -translate-y-1' 
                 : c.isUnknown 
                   ? 'bg-amber-50 border-amber-200 hover:border-amber-400 text-amber-900'
                   : 'bg-white border-slate-100 hover:border-red-200 hover:shadow-md text-slate-800'
               }`}
             >
               <div className="flex items-center justify-between mb-2">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${
                    selectedCarrierFilter === c.name ? 'text-red-100' : c.isUnknown ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    {c.name}
                  </p>
                  {c.isUnknown && (
                    <span className="material-icons text-amber-500 text-sm">warning</span>
                  )}
               </div>
               <p className="text-xl font-black tracking-tighter mb-1">
                 {formatBRL(c.totalPrevisto)}
               </p>
               <div className="flex items-center justify-between mt-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedCarrierFilter === c.name ? 'bg-white/20 text-white' : c.isUnknown ? 'bg-amber-200/50 text-amber-800' : 'bg-slate-50 text-slate-500'
                  }`}>
                    {c.qty} CNTR
                  </span>
                  <span className={`material-icons text-sm ${
                    selectedCarrierFilter === c.name ? 'text-white' : c.isUnknown ? 'text-amber-400' : 'text-slate-200 group-hover:text-red-300'
                  }`}>
                    {selectedCarrierFilter === c.name ? 'check_circle' : 'arrow_forward'}
                  </span>
               </div>
             </button>
           ))}
        </div>
      </section>

      {/* KPI Cards (Filtered) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <span className="material-icons text-7xl text-slate-900">analytics</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Selected Previsto (Target)</p>
          <h3 className="text-3xl font-black text-slate-900">{formatBRL(totals.previsto)}</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Benchmark rate calculation</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Selected Realizado (Actual)</p>
          <h3 className="text-3xl font-black text-slate-900">{formatBRL(totals.realizado)}</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Based on history</p>
        </div>

        <div className={`rounded-[2rem] p-8 border shadow-lg ${totals.realizado > totals.previsto ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Payment Variance</p>
          <h3 className={`text-3xl font-black ${totals.realizado > totals.previsto ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatBRL(Math.abs(totals.realizado - totals.previsto))}
          </h3>
          <p className={`text-[10px] font-bold mt-2 uppercase ${totals.realizado > totals.previsto ? 'text-red-400' : 'text-emerald-400'}`}>
            {totals.realizado > totals.previsto ? 'OVER BUDGET' : 'UNDER BUDGET / SAVING'}
          </p>
        </div>
      </div>

      {/* Detailed Table (Filtered) */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
           <div>
             <h3 className="text-lg font-black text-slate-800 tracking-tight">Disbursement & Estimation Detail</h3>
             <p className="text-xs text-slate-400 font-bold uppercase mt-1">
               {selectedCarrierFilter ? `Showing invoices for: ${selectedCarrierFilter}` : 'Showing all truck companies'}
             </p>
           </div>
           <div className="flex gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500 shadow-sm shadow-emerald-100"></span>
              <span className="h-4 w-4 rounded-full bg-amber-500 shadow-sm shadow-amber-100"></span>
              <span className="h-4 w-4 rounded-full bg-red-500 shadow-sm shadow-red-100"></span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                <th className="px-10 py-6">Month</th>
                <th className="px-6 py-6">Warehouse</th>
                <th className="px-6 py-6">Truck Company</th>
                <th className="px-6 py-6 text-center">Qty</th>
                <th className="px-6 py-6 text-right">Unit Rate</th>
                <th className="px-6 py-6 text-right bg-slate-50/30">Previsto</th>
                <th className="px-6 py-6 text-right">Realizado</th>
                <th className="px-10 py-6 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredRows.length > 0 ? filteredRows.map((row, idx) => {
                const isOverBudget = row.realizado > row.previsto;
                const isCarrierUnknown = row.carrier === "Carrier Not Identified";
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all group cursor-default">
                    <td className="px-10 py-6 font-bold text-slate-800">{row.month}</td>
                    <td className="px-6 py-6 text-slate-600 font-medium">{row.warehouse}</td>
                    <td className="px-6 py-6">
                      <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase ${
                        isCarrierUnknown ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.carrier}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center font-black text-slate-900">{row.qty}</td>
                    <td className="px-6 py-6 text-right text-slate-400 font-medium">{formatBRL(row.rate)}</td>
                    <td className="px-6 py-6 text-right font-black text-slate-900 bg-slate-50/30">{formatBRL(row.previsto)}</td>
                    <td className="px-6 py-6 text-right font-bold text-slate-800">{formatBRL(row.realizado)}</td>
                    <td className="px-10 py-6 text-right">
                      <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-[11px] shadow-sm ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                         <span className="material-icons text-xs font-black">{isOverBudget ? 'priority_high' : 'check'}</span>
                         {row.deltaPct.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-10 py-32 text-center">
                     <div className="flex flex-col items-center">
                        <span className="material-icons text-7xl text-slate-200 mb-6">search_off</span>
                        <h4 className="text-xl font-black text-slate-300 uppercase tracking-tighter">No Financial Exposure Found</h4>
                        <p className="text-slate-400 text-sm mt-2 font-medium">Try resetting your filters or selecting a different company.</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest">
                <tr>
                  <td colSpan={3} className="px-10 py-8">Section Summary</td>
                  <td className="px-6 py-8 text-center">{totals.qty} CNTR</td>
                  <td className="px-6 py-8 text-right">—</td>
                  <td className="px-6 py-8 text-right">{formatBRL(totals.previsto)}</td>
                  <td className="px-6 py-8 text-right">{formatBRL(totals.realizado)}</td>
                  <td className="px-10 py-8 text-right text-emerald-400">
                    <span className="flex items-center justify-end gap-2">
                       <span className="material-icons text-sm">security</span>
                       {totals.previsto > totals.realizado ? 'PROVISION SAVING DETECTED' : 'BUDGET ATTENTION REQUIRED'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
