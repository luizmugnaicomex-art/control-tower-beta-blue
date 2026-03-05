
import React, { useState, useMemo } from "react";
import { WAREHOUSE_CONTRACTS } from "../constants";
import { WarehouseContract, Shipment } from "../types";

interface WarehouseSimulationProps {
  historicalShipments?: Shipment[];
}

interface WarehouseEstimativeRow {
  month: string;
  warehouse: string;
  qty: number;
  avgDays: number;
  previsto: number;
  realizado: number;
  delta: number;
  deltaPct: number;
}

export function WarehouseSimulation({ historicalShipments = [] }: WarehouseSimulationProps) {
  const [cargoValue, setCargoValue] = useState<number>(250000);
  const [days, setDays] = useState<number>(20);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string | null>(null);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const calculateWarehouseCost = (contract: WarehouseContract, value: number, daysIn: number, qty: number) => {
    const safeDays = Math.max(1, daysIn);
    const numPeriods = Math.ceil(safeDays / contract.periodDays);
    const getPeriodIndex = (p: number) => Math.min(p - 1, 2);

    let storageCost = 0;
    for (let p = 1; p <= numPeriods; p++) {
      const idx = getPeriodIndex(p);
      const minRate = contract.minRates[idx];
      const pct = contract.storagePct[idx];
      storageCost += Math.max(value * pct, minRate);
    }

    const gris = value * contract.grisPct;
    const adValorem = value * contract.adValoremPct;
    const removal = contract.removalFee;
    const handling = contract.handlingFee;
    const presence = contract.presenceFee;
    const scanning = contract.scanningFee;

    const total = (storageCost + gris + removal + adValorem + handling + presence + scanning) * qty;

    return {
      storage: storageCost * qty,
      gris: gris * qty,
      removal: removal * qty,
      adValorem: adValorem * qty,
      handling: handling * qty,
      presence: presence * qty,
      scanning: scanning * qty,
      total
    };
  };

  const results = useMemo(() => {
    const list = WAREHOUSE_CONTRACTS.map(contract => ({
      contract,
      costs: calculateWarehouseCost(contract, cargoValue, days, quantity)
    }));
    return list.sort((a, b) => a.costs.total - b.costs.total);
  }, [cargoValue, days, quantity]);

  const winner = results[0];

  // --- Historical Provision Logic (Same as Truck Estimative) ---
  const historicalProvisionData = useMemo(() => {
    const groups: Record<string, { qty: number; totalDays: number; realizado: number }> = {};

    historicalShipments.forEach((s) => {
      const date = s.deliveryByd || s.ata;
      if (!date) return;

      const monthLabel = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const warehouse = s.bondedWarehouse || "Terminal Not Identified";
      const key = `${monthLabel}|${warehouse}`;

      if (!groups[key]) {
        groups[key] = { qty: 0, totalDays: 0, realizado: 0 };
      }

      groups[key].qty += 1;
      groups[key].totalDays += (s.totalClearanceTime || 10); // Assume 10 if missing
      groups[key].realizado += (s.extraCost || 0);
    });

    return Object.entries(groups).map(([key, data]) => {
      const [month, warehouse] = key.split('|');
      const avgDays = Math.round(data.totalDays / data.qty);
      
      // Find matching contract to calculate "Previsto"
      const bwUpper = warehouse.toUpperCase();
      let contractId = "TECON";
      if (bwUpper.includes("INTERMAR")) contractId = "INTERMARITIMA";
      else if (bwUpper.includes("TPC")) contractId = "TPC";
      else if (bwUpper.includes("CLIA") || bwUpper.includes("EMP")) contractId = "CLIA_EMP";

      const contract = WAREHOUSE_CONTRACTS.find(c => c.id === contractId);
      let previsto = 0;
      if (contract) {
        // We use the current simulator's cargo value as the reference for benchmark comparison
        const cost = calculateWarehouseCost(contract, cargoValue, avgDays, data.qty);
        previsto = cost.total;
      }

      const delta = data.realizado - previsto;
      const deltaPct = previsto > 0 ? (delta / previsto) * 100 : 0;

      return {
        month,
        warehouse,
        qty: data.qty,
        avgDays,
        previsto,
        realizado: data.realizado,
        delta,
        deltaPct
      } as WarehouseEstimativeRow;
    }).sort((a, b) => b.qty - a.qty);
  }, [historicalShipments, cargoValue]);

  const filteredHistory = useMemo(() => {
    if (!selectedWarehouseFilter) return historicalProvisionData;
    return historicalProvisionData.filter(h => h.warehouse === selectedWarehouseFilter);
  }, [historicalProvisionData, selectedWarehouseFilter]);

  const historyTotals = useMemo(() => {
    return filteredHistory.reduce((acc, curr) => ({
      previsto: acc.previsto + curr.previsto,
      realizado: acc.realizado + curr.realizado,
      qty: acc.qty + curr.qty
    }), { previsto: 0, realizado: 0, qty: 0 });
  }, [filteredHistory]);

  const warehouseSummaries = useMemo(() => {
    const summary: Record<string, { name: string; previsto: number; realizado: number; qty: number }> = {};
    historicalProvisionData.forEach(row => {
      if (!summary[row.warehouse]) summary[row.warehouse] = { name: row.warehouse, previsto: 0, realizado: 0, qty: 0 };
      summary[row.warehouse].previsto += row.previsto;
      summary[row.warehouse].realizado += row.realizado;
      summary[row.warehouse].qty += row.qty;
    });
    return Object.values(summary).sort((a, b) => b.previsto - a.previsto);
  }, [historicalProvisionData]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* Simulation Control Panel */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
             <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-100">
                <span className="material-icons text-white text-3xl">warehouse</span>
             </div>
             <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Warehouse Simulator</h2>
                <p className="text-slate-400 text-sm mt-2 font-medium italic">Compare storage costs based on active contracts and cargo value.</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full lg:w-auto">
           <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Cargo Value (BRL)</label>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-300">R$</span>
                 <input 
                   type="number" 
                   value={cargoValue}
                   onChange={(e) => setCargoValue(Number(e.target.value))}
                   className="w-full pl-10 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-200 transition-all" 
                 />
              </div>
           </div>

           <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Days Stored</label>
              <div className="relative">
                 <input 
                   type="number" 
                   value={days}
                   onChange={(e) => setDays(Number(e.target.value))}
                   className="w-full px-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-200 transition-all" 
                 />
                 <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300">Days</span>
              </div>
           </div>

           <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">CNTR Qty</label>
              <div className="relative">
                 <input 
                   type="number" 
                   value={quantity}
                   onChange={(e) => setQuantity(Number(e.target.value))}
                   className="w-full px-4 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-50 focus:border-amber-200 transition-all" 
                 />
                 <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300">Unit</span>
              </div>
           </div>
        </div>
      </div>

      {/* Comparison Grid (Simulated) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {results.map(({ contract, costs }, idx) => {
           const isWinner = contract.id === winner.contract.id;
           const gap = costs.total - winner.costs.total;
           const gapPct = winner.costs.total > 0 ? (gap / winner.costs.total) * 100 : 0;

           return (
             <div 
               key={contract.id}
               className={`relative p-8 rounded-[2.5rem] border transition-all flex flex-col ${
                 isWinner 
                 ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200 -translate-y-2' 
                 : 'bg-white border-slate-100 text-slate-800 hover:border-amber-200 hover:shadow-lg'
               }`}
             >
               {isWinner && (
                 <div className="absolute top-6 right-6 flex items-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase animate-pulse">
                    <span className="material-icons text-xs">workspace_premium</span>
                    Best Value
                 </div>
               )}

               <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isWinner ? 'text-slate-500' : 'text-slate-400'}`}>
                 {contract.name}
               </p>
               
               <h3 className="text-3xl font-black tracking-tighter mb-1">
                 {formatBRL(costs.total)}
               </h3>
               
               {!isWinner && gap > 0 && (
                 <p className="text-[11px] font-bold text-red-500">
                    +{formatBRL(gap)} (+{gapPct.toFixed(1)}%)
                 </p>
               )}

               <div className="h-[2px] w-full bg-slate-100/10 my-6 rounded-full"></div>

               <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                     <span className={`text-[11px] font-bold ${isWinner ? 'text-slate-500' : 'text-slate-400'}`}>Storage</span>
                     <span className="text-[12px] font-black">{formatBRL(costs.storage)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className={`text-[11px] font-bold ${isWinner ? 'text-slate-500' : 'text-slate-400'}`}>Handling</span>
                     <span className="text-[12px] font-black">{formatBRL(costs.handling)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className={`text-[11px] font-bold ${isWinner ? 'text-slate-500' : 'text-slate-400'}`}>Scanning</span>
                     <span className="text-[12px] font-black">{formatBRL(costs.scanning)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className={`text-[11px] font-bold ${isWinner ? 'text-slate-500' : 'text-slate-400'}`}>Presence</span>
                     <span className="text-[12px] font-black">{formatBRL(costs.presence)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className={`text-[11px] font-bold ${isWinner ? 'text-slate-500' : 'text-slate-400'}`}>Ad Valorem</span>
                     <span className="text-[12px] font-black">{formatBRL(costs.adValorem)}</span>
                  </div>
               </div>

               <div className={`mt-8 p-4 rounded-2xl ${isWinner ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`text-[9px] font-black uppercase mb-1 ${isWinner ? 'text-slate-500' : 'text-slate-400'}`}>Contract Period</p>
                  <p className="text-xs font-bold">{contract.periodDays} Days Cycle</p>
               </div>
             </div>
           );
         })}
      </div>

      {/* Historical Provision Analysis (Same as Truck Estimative) */}
      <section className="space-y-8 pt-8 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
           <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Warehouse Provision Analysis</h2>
              <p className="text-slate-400 text-sm mt-2 font-medium">Automatic comparison between historical storage costs and benchmark contracts.</p>
           </div>
           
           <div className="flex bg-slate-100 p-1 rounded-2xl">
              {warehouseSummaries.map((w) => (
                <button
                  key={w.name}
                  onClick={() => setSelectedWarehouseFilter(selectedWarehouseFilter === w.name ? null : w.name)}
                  className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                    selectedWarehouseFilter === w.name ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {w.name}
                </button>
              ))}
              {selectedWarehouseFilter && (
                <button 
                  onClick={() => setSelectedWarehouseFilter(null)}
                  className="px-4 py-2 text-xs font-black text-red-500"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              )}
           </div>
        </div>

        {/* Historical KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Historical Previsto (Provision)</p>
              <h3 className="text-3xl font-black text-slate-900">{formatBRL(historyTotals.previsto)}</h3>
              <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Benchmarked by contract terms</p>
           </div>
           <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Historical Realizado (Actual Extra)</p>
              <h3 className="text-3xl font-black text-slate-900">{formatBRL(historyTotals.realizado)}</h3>
              <p className="text-[10px] text-slate-400 mt-2 font-bold italic">Total storage/extra charges from file</p>
           </div>
           <div className={`rounded-[2rem] p-8 border shadow-lg ${historyTotals.realizado > historyTotals.previsto ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Historical Variance</p>
              <h3 className={`text-3xl font-black ${historyTotals.realizado > historyTotals.previsto ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatBRL(Math.abs(historyTotals.realizado - historyTotals.previsto))}
              </h3>
              <p className={`text-[10px] font-bold mt-2 uppercase ${historyTotals.realizado > historyTotals.previsto ? 'text-red-400' : 'text-emerald-400'}`}>
                {historyTotals.realizado > historyTotals.previsto ? 'COST OVERFLOW' : 'EFFICIENT STORAGE'}
              </p>
           </div>
        </div>

        {/* Detailed Table (Historical) */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
             <div>
               <h3 className="text-lg font-black text-slate-800 tracking-tight">Bonded Warehouse Analysis Detail</h3>
               <p className="text-xs text-slate-400 font-bold uppercase mt-1">Cross-referencing historical lead times with current contract rates.</p>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                  <th className="px-10 py-6">Month</th>
                  <th className="px-6 py-6">Warehouse</th>
                  <th className="px-6 py-6 text-center">Volume</th>
                  <th className="px-6 py-6 text-center">Avg Days</th>
                  <th className="px-6 py-6 text-right bg-slate-50/30">Benchmark (Previsto)</th>
                  <th className="px-6 py-6 text-right">Actual (Realizado)</th>
                  <th className="px-10 py-6 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.length > 0 ? filteredHistory.map((row, idx) => {
                  const isOverBudget = row.realizado > row.previsto;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-all group">
                      <td className="px-10 py-6 font-bold text-slate-800">{row.month}</td>
                      <td className="px-6 py-6 text-slate-600 font-medium">{row.warehouse}</td>
                      <td className="px-6 py-6 text-center font-black text-slate-900">{row.qty} CNTR</td>
                      <td className="px-6 py-6 text-center text-slate-500 font-bold">{row.avgDays} Days</td>
                      <td className="px-6 py-6 text-right font-black text-slate-900 bg-slate-50/30">{formatBRL(row.previsto)}</td>
                      <td className="px-6 py-6 text-right font-bold text-slate-800">{formatBRL(row.realizado)}</td>
                      <td className="px-10 py-6 text-right">
                         <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-[11px] shadow-sm ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <span className="material-icons text-xs font-black">{isOverBudget ? 'warning' : 'check_circle'}</span>
                            {row.deltaPct.toFixed(1)}%
                         </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-10 py-32 text-center text-slate-300 font-bold uppercase">No historical data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
