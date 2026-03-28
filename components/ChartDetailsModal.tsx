
import React, { useState, useMemo } from 'react';
import { Shipment } from '../types';
import { currencyFormatter } from '../utils/formatters';
import { getContractForWarehouse, calculateWarehouseCost, DEFAULT_CARGO_VALUE } from '../utils/financials';
import { exportShipmentsToExcel } from '../utils/export';

interface ChartDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    weekLabel: string;
    shipments: Shipment[];
    avgDrainRate?: number;
    groupedData?: Record<string, Record<string, string[]>>;
}

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

const ChartDetailsModal: React.FC<ChartDetailsModalProps> = ({ isOpen, onClose, weekLabel, shipments, avgDrainRate = 1, groupedData }) => {
    const [showOnlyPending, setShowOnlyPending] = useState(false);
    const [expandedVessels, setExpandedVessels] = useState<Record<string, boolean>>({});
    const [expandedBLs, setExpandedBLs] = useState<Record<string, boolean>>({});

    const toggleVessel = (vessel: string) => {
        setExpandedVessels(prev => ({ ...prev, [vessel]: !prev[vessel] }));
    };

    const toggleBL = (bl: string) => {
        setExpandedBLs(prev => ({ ...prev, [bl]: !prev[bl] }));
    };

    const displayedShipments = useMemo(() => {
        if (!shipments) return [];
        return showOnlyPending ? shipments.filter(s => s && isValidDate(s.deliveryByd) === false) : shipments;
    }, [shipments, showOnlyPending]);

    const isDemurrageView = (weekLabel || '').toLowerCase().includes('demurrage') || (weekLabel || '').toLowerCase().includes('risk');
    const isClearanceView = (weekLabel || '').toLowerCase().includes('clearance') || (weekLabel || '').toLowerCase().includes('customs');
    const isCargoReadyView = (weekLabel || '').toLowerCase().includes('cargo ready');
    const isAtaView = (weekLabel || '').toLowerCase().includes('vessel arrivals');
    const isProjectedView = (weekLabel || '').toLowerCase().includes('projected');
    const isPipelineView = (weekLabel || '').toLowerCase().includes('pipeline') || (weekLabel || '').toLowerCase().includes('week drilldown');

    const pipelineSummary = useMemo(() => {
        if (!isOpen || !isPipelineView || !shipments || shipments.length === 0) return null;
        
        const dates = shipments
            .map(s => s ? (s.ata || s.estimatedDelivery) : null)
            .filter(isValidDate);
            
        const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
        
        const vessels = new Set(shipments.map(s => s?.vesselName).filter(Boolean));
        
        const drainDaysFactory = Math.ceil(shipments.length / 150);
        const status = drainDaysFactory > 10 ? 'TIME COLLISION (150/D)' : 'SAFE';

        return {
            range: isValidDate(minDate) && isValidDate(maxDate) 
                ? `${minDate.toLocaleDateString('pt-BR')} → ${maxDate.toLocaleDateString('pt-BR')}` 
                : 'N/A',
            vesselsCount: vessels.size,
            total: shipments.length,
            status
        };
    }, [isOpen, isPipelineView, shipments]);

    const pipelineDailyBreakdown = useMemo(() => {
        if (!isOpen || !isPipelineView || !shipments) return [];
        const dailyMap: Record<string, { date: Date; qty: number; vessels: Set<string> }> = {};
        
        shipments.forEach(s => {
            if (!s) return;
            const date = s.ata || s.estimatedDelivery;
            if (!isValidDate(date)) return;
            
            try {
                const key = date.toISOString().split('T')[0];
                if (!dailyMap[key]) {
                    dailyMap[key] = { date, qty: 0, vessels: new Set() };
                }
                dailyMap[key].qty++;
                if (s.vesselName) dailyMap[key].vessels.add(s.vesselName);
            } catch (e) {
                console.error("Error processing date in pipeline breakdown", e);
            }
        });

        return Object.values(dailyMap).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [isOpen, isPipelineView, shipments]);

    const pipelineVesselBreakdown = useMemo(() => {
        if (!isOpen || !isPipelineView || !shipments) return [];
        const vesselMap: Record<string, { name: string; qty: number; minEta: Date | null; maxEta: Date | null; terminals: Record<string, number> }> = {};

        shipments.forEach(s => {
            if (!s) return;
            const name = s.vesselName || 'A DEFINIR';
            if (!vesselMap[name]) {
                vesselMap[name] = { name, qty: 0, minEta: null, maxEta: null, terminals: {} };
            }
            vesselMap[name].qty++;
            
            const eta = s.ata || s.estimatedDelivery;
            if (isValidDate(eta)) {
                if (!vesselMap[name].minEta || eta < vesselMap[name].minEta) vesselMap[name].minEta = eta;
                if (!vesselMap[name].maxEta || eta > vesselMap[name].maxEta) vesselMap[name].maxEta = eta;
            }

            const terminal = s.bondedWarehouse || 'OUTROS';
            vesselMap[name].terminals[terminal] = (vesselMap[name].terminals[terminal] || 0) + 1;
        });

        return Object.values(vesselMap).sort((a, b) => b.qty - a.qty);
    }, [isOpen, isPipelineView, shipments]);

    const totalCostInView = useMemo(() => {
        if (!isOpen || !shipments) return 0;
        if (isProjectedView) {
            const todayUTC = new Date();
            todayUTC.setHours(0,0,0,0);
            return shipments.reduce((sum, s, index) => {
                if (!s) return sum;
                const startDate = s.cargoReadyDate || s.ata;
                if (!isValidDate(startDate)) return sum;
                
                try {
                    const daysAlreadyInBacklog = (todayUTC.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                    const estimatedDaysToDrain = index / avgDrainRate;
                    const projectedDays = Math.ceil(daysAlreadyInBacklog + estimatedDaysToDrain);
                    const contract = getContractForWarehouse(s.bondedWarehouse);
                    const cost = calculateWarehouseCost(contract, DEFAULT_CARGO_VALUE, projectedDays, 1);
                    return sum + cost.total;
                } catch (e) {
                    return sum;
                }
            }, 0);
        }
        return shipments.reduce((sum, s) => sum + (s ? (isDemurrageView ? s.demurrageCost : (s.totalCost || 0)) : 0), 0);
    }, [isOpen, shipments, isDemurrageView, isProjectedView, avgDrainRate]);

    const { pendingCount, lateShipments } = useMemo(() => {
        if (!isOpen || !shipments) return { pendingCount: 0, lateShipments: 0 };
        return {
            pendingCount: shipments.filter(s => s && !s.deliveryByd).length,
            lateShipments: shipments.filter(s => s && s.clientDeliveryVariance !== null && s.clientDeliveryVariance > 0).length
        };
    }, [isOpen, shipments]);

    const tableData = useMemo(() => {
        if (!isOpen || !displayedShipments) return [];
        const todayUTC = new Date();
        todayUTC.setHours(0,0,0,0);

        return displayedShipments.map((s, idx) => {
            if (!s) return null;
            let projectedCost = '-';
            let currentAge = '-';
            
            if (isProjectedView) {
                const start = s.cargoReadyDate || s.ata;
                if (isValidDate(start)) {
                    try {
                        const daysAlreadyInBacklog = (todayUTC.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                        const estimatedDaysToDrain = idx / avgDrainRate;
                        const projectedDays = Math.ceil(daysAlreadyInBacklog + estimatedDaysToDrain);
                        const contract = getContractForWarehouse(s.bondedWarehouse);
                        const cost = calculateWarehouseCost(contract, DEFAULT_CARGO_VALUE, projectedDays, 1);
                        projectedCost = currencyFormatter.format(cost.total).replace('.00','');
                        currentAge = `${Math.floor(daysAlreadyInBacklog)} Days`;
                    } catch (e) {
                        // Keep defaults
                    }
                }
            }
            
            return {
                ...s,
                projectedCost,
                currentAge
            };
        }).filter(Boolean).slice(0, 100) as any[];
    }, [isOpen, displayedShipments, isProjectedView, avgDrainRate]);

    if (!isOpen) return null;

    const count = shipments?.length || 0;

    const getStatusBadge = (s: Shipment) => {
        const isDelivered = !!s.deliveryByd;
        const isReturned = !!s.actualDepotReturnDate;
        const hasDemurrage = s.demurrageCost > 0;

        if (!isDelivered) {
            return (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border bg-amber-50 text-amber-600 border-amber-100 animate-pulse flex items-center gap-1 w-fit">
                    <span className="material-icons text-[10px]">pending_actions</span>
                    Pending
                </span>
            );
        }

        if (isDelivered && !isReturned) {
            return (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1 w-fit">
                    <span className="material-icons text-[10px]">local_shipping</span>
                    In Use / Picked
                </span>
            );
        }

        if (isReturned && !hasDemurrage) {
            return (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1 w-fit">
                    <span className="material-icons text-[10px]">task_alt</span>
                    Finished
                </span>
            );
        }

        return (
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1 w-fit">
                <span className="material-icons text-[10px]">history_toggle_off</span>
                Late Return
            </span>
        );
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <div className="relative transform overflow-hidden rounded-[2rem] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-6xl border border-slate-100">
                    <div className="bg-white px-8 pt-8 pb-4 sm:p-10 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                 <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight" id="modal-title">
                                        {weekLabel}
                                    </h3>
                                    <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors">
                                        <span className="material-icons text-3xl">close</span>
                                    </button>
                                </div>

                                {isPipelineView && pipelineSummary && (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            RANGE: <span className="text-slate-600">{pipelineSummary.range}</span>
                                        </span>
                                        <span className="text-slate-200">|</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            VESSELS: <span className="text-slate-600">{pipelineSummary.vesselsCount}</span>
                                        </span>
                                        <span className="text-slate-200">|</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            TOTAL: <span className="text-slate-600">{pipelineSummary.total} FCL</span>
                                        </span>
                                        <span className={`ml-2 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                            pipelineSummary.status.includes('COLLISION') 
                                            ? 'bg-red-50 text-red-600 border-red-100' 
                                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                            {pipelineSummary.status}
                                        </span>
                                    </div>
                                )}
                                
                                {/* Calculation Summary Panel */}
                                <div className="mt-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Live Process Summary</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-gray-700">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Total Impact</p>
                                            <p className="text-2xl font-black text-slate-900">{count} <span className="text-xs text-slate-400">Containers</span></p>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Financial Exposure</p>
                                            <p className="text-2xl font-black text-red-600">{currencyFormatter.format(totalCostInView).replace('.00','')}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Operations Late</p>
                                            <p className="text-2xl font-black text-slate-900">{lateShipments}</p>
                                            <p className="text-[9px] text-red-400 font-bold uppercase mt-1">* Estimated was missed</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Process Quality</p>
                                            <p className="text-2xl font-black text-emerald-600">
                                                {count > 0 ? (((count - lateShipments) / count) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                 {/* Pipeline Specific Analytics */}
                                {isPipelineView && (
                                    <div className="mt-8 space-y-8">
                                        {/* Arrival by Day */}
                                        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Arrival by Day (Inside the week)</h4>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Vessels list shown per day</span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                                            <th className="px-8 py-3">Date</th>
                                                            <th className="px-6 py-3">Qty</th>
                                                            <th className="px-8 py-3">Vessels</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {pipelineDailyBreakdown.map((day, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-8 py-4 text-sm font-black text-slate-800">{isValidDate(day.date) ? day.date.toLocaleDateString('pt-BR') : '-'}</td>
                                                                <td className={`px-6 py-4 text-sm font-black ${day.qty > 100 ? 'text-orange-600' : 'text-slate-900'}`}>{day.qty}</td>
                                                                <td className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                                                    {Array.from(day.vessels).join(', ') || 'N/A'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Vessels Arriving */}
                                        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Vessels Arriving this week</h4>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Sorted by Qty</span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                                            <th className="px-8 py-3">Vessel</th>
                                                            <th className="px-6 py-3">Qty</th>
                                                            <th className="px-6 py-3">ETA Min</th>
                                                            <th className="px-6 py-3">ETA Max</th>
                                                            <th className="px-8 py-3">Terminals (Mapped)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {pipelineVesselBreakdown.map((v, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-8 py-4 text-sm font-black text-indigo-600 uppercase">{v.name}</td>
                                                                <td className="px-6 py-4 text-sm font-black text-slate-900">{v.qty}</td>
                                                                <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{isValidDate(v.minEta) ? v.minEta.toLocaleDateString('pt-BR') : '-'}</td>
                                                                <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{isValidDate(v.maxEta) ? v.maxEta.toLocaleDateString('pt-BR') : '-'}</td>
                                                                <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                                    {Object.entries(v.terminals)
                                                                        .map(([term, count]) => `${term}:${count}`)
                                                                        .join(' | ')}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* How to read this */}
                                        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">How to read this</h4>
                                            <ul className="space-y-2">
                                                <li className="flex items-start gap-3 text-[11px] text-slate-500 font-bold leading-relaxed">
                                                    <span className="text-indigo-600">•</span>
                                                    <span>Collision happens when Factory drain days exceeds your goal (10d) due to 150/day.</span>
                                                </li>
                                                <li className="flex items-start gap-3 text-[11px] text-slate-500 font-bold leading-relaxed">
                                                    <span className="text-indigo-600">•</span>
                                                    <span>Peak Day highlights day-level stacking (multiple vessels arriving same day).</span>
                                                </li>
                                                <li className="flex items-start gap-3 text-[11px] text-slate-500 font-bold leading-relaxed">
                                                    <span className="text-indigo-600">•</span>
                                                    <span>Terminals uses normalized mapping (case/accents resilient) so Intermarítima/INTERMARITIMA/intermaritima all count together.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Detailed Process Table */}
                                <div className="mt-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Considered Process Log</h4>
                                            <p className="text-[11px] text-slate-400 font-bold mt-1">Listing detailed performance records for this cycle</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => exportShipmentsToExcel(displayedShipments, `${weekLabel.replace(/\s+/g, '_')}_Export.xlsx`)}
                                                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ring-1 bg-emerald-600 text-white ring-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
                                            >
                                                <span className="material-icons text-sm">download</span>
                                                Export Excel
                                            </button>
                                            <div className="h-8 w-[1px] bg-slate-100 mx-1 hidden sm:block"></div>
                                            <button 
                                                onClick={() => setShowOnlyPending(!showOnlyPending)}
                                                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ring-1 ${
                                                    showOnlyPending 
                                                    ? 'bg-indigo-600 text-white ring-indigo-600 shadow-indigo-200' 
                                                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="material-icons text-sm">{showOnlyPending ? 'check_circle' : 'pending_actions'}</span>
                                                Show Pending Only ({pendingCount})
                                            </button>
                                            <div className="h-8 w-[1px] bg-slate-100 mx-1 hidden sm:block"></div>
                                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-2xl ring-1 ring-slate-100">
                                                {displayedShipments.length} UNITS SHOWN
                                            </span>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto max-h-[500px] border border-slate-50 rounded-2xl shadow-inner bg-slate-50/20">
                                        {groupedData ? (
                                            <div className="p-4 space-y-4">
                                                {Object.entries(groupedData).map(([vessel, bls]) => (
                                                    <div key={vessel} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                                        <button 
                                                            onClick={() => toggleVessel(vessel)}
                                                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="material-icons text-slate-400">
                                                                    {expandedVessels[vessel] ? 'expand_more' : 'chevron_right'}
                                                                </span>
                                                                <span className="font-black text-slate-800 uppercase tracking-wide">{vessel}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                                                                {Object.keys(bls).length} BLs
                                                            </span>
                                                        </button>
                                                        
                                                        {expandedVessels[vessel] && (
                                                            <div className="p-4 space-y-3 bg-white border-t border-slate-100">
                                                                {Object.entries(bls).map(([bl, containers]) => (
                                                                    <div key={bl} className="border border-slate-100 rounded-lg overflow-hidden">
                                                                        <button 
                                                                            onClick={() => toggleBL(bl)}
                                                                            className="w-full flex items-center justify-between p-3 bg-indigo-50/50 hover:bg-indigo-50 transition-colors text-left"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="material-icons text-indigo-400 text-sm">
                                                                                    {expandedBLs[bl] ? 'expand_more' : 'chevron_right'}
                                                                                </span>
                                                                                <span className="font-bold text-indigo-700 text-sm">{bl}</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-black text-indigo-500 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                                                                                {containers.length} Containers
                                                                            </span>
                                                                        </button>
                                                                        
                                                                        {expandedBLs[bl] && (
                                                                            <div className="p-3 bg-white border-t border-indigo-50">
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {containers.map((container, i) => (
                                                                                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded-md border border-slate-200">
                                                                                            {container}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                        <>
                                        <table className="min-w-full divide-y divide-slate-100">
                                            <thead className="bg-white sticky top-0 z-10 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Container ID</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">BL / Document</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Vessel Name</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Trucking Co</th>
                                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider min-w-[140px]">Live Status</th>
                                                    
                                                    {isDemurrageView ? (
                                                        <>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Free Time End</th>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Actual Return</th>
                                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Cost (USD)</th>
                                                        </>
                                                    ) : isClearanceView ? (
                                                        <>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">ATA Port</th>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Customs Ch.</th>
                                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">NF Date</th>
                                                        </>
                                                    ) : isCargoReadyView || isAtaView ? (
                                                        <>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">ATA Port</th>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Cargo Ready</th>
                                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Est. Delivery</th>
                                                        </>
                                                    ) : isProjectedView ? (
                                                        <>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Presence Start</th>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Current Age</th>
                                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Projected Total</th>
                                                        </>
                                                    ) : isPipelineView ? (
                                                        <>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">ETA (Port)</th>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Warehouse</th>
                                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Estimated</th>
                                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Actual Del.</th>
                                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Delay</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-50">
                                                {tableData.map((s, idx) => {
                                                    const isDelivered = !!s.deliveryByd;
                                                    return (
                                                        <tr key={idx} className={`hover:bg-slate-50 transition-all group ${!isDelivered ? 'bg-amber-50/10' : ''}`}>
                                                            <td className="px-6 py-4 text-sm font-black text-slate-900">{s.containerNumber}</td>
                                                            <td className="px-6 py-4 text-xs font-black text-indigo-600">{s.billOfLading || 'N/A'}</td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{s.vesselName || 'N/A'}</td>
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{s.carrier}</td>
                                                            <td className="px-6 py-4">
                                                                {getStatusBadge(s)}
                                                            </td>
                                                            
                                                            {isDemurrageView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{isValidDate(s.freeTimeDate) ? s.freeTimeDate.toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{isValidDate(s.actualDepotReturnDate) ? s.actualDepotReturnDate.toLocaleDateString() : 'Pending'}</td>
                                                                    <td className="px-6 py-4 text-sm font-black text-right text-red-600">
                                                                        {s.demurrageCost > 0 ? currencyFormatter.format(s.demurrageCost) : '-'}
                                                                    </td>
                                                                </>
                                                            ) : isClearanceView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{isValidDate(s.ata) ? s.ata.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{isValidDate(s.channelDate) ? s.channelDate.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-right text-slate-900">
                                                                        {isValidDate(s.dateNF) ? s.dateNF.toLocaleDateString() : 'In Process'}
                                                                    </td>
                                                                </>
                                                            ) : isCargoReadyView || isAtaView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{isValidDate(s.ata) ? s.ata.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{isValidDate(s.cargoReadyDate) ? s.cargoReadyDate.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-right text-slate-900">
                                                                        {isValidDate(s.estimatedDelivery) ? s.estimatedDelivery.toLocaleDateString() : '-'}
                                                                    </td>
                                                                </>
                                                            ) : isProjectedView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">
                                                                        {isValidDate(s.cargoReadyDate || s.ata) ? (s.cargoReadyDate || s.ata)!.toLocaleDateString() : '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">
                                                                        {s.currentAge}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm font-black text-right text-orange-600">
                                                                        {s.projectedCost}
                                                                    </td>
                                                                </>
                                                            ) : isPipelineView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{isValidDate(s.ata || s.estimatedDelivery) ? (s.ata || s.estimatedDelivery)!.toLocaleDateString('pt-BR') : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{s.bondedWarehouse}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-right">
                                                                        {isValidDate(s.deliveryByd) ? (
                                                                            <span className="text-emerald-600">Delivered</span>
                                                                        ) : (
                                                                            <span className="text-amber-600">In Transit</span>
                                                                        )}
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{isValidDate(s.estimatedDelivery) ? s.estimatedDelivery.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{isValidDate(s.deliveryByd) ? s.deliveryByd.toLocaleDateString() : '-'}</td>
                                                                    <td className={`px-6 py-4 text-sm font-black text-right ${ (s.clientDeliveryVariance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                        {s.clientDeliveryVariance !== null ? (s.clientDeliveryVariance > 0 ? `+${s.clientDeliveryVariance}` : s.clientDeliveryVariance) : '-'}
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                                {displayedShipments.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-32 text-center">
                                                            <div className="flex flex-col items-center gap-4">
                                                                <span className="material-icons text-6xl text-slate-200">
                                                                    {showOnlyPending ? 'task_alt' : 'inventory_2'}
                                                                </span>
                                                                <div>
                                                                    <h4 className="text-xl font-black text-slate-300 uppercase tracking-tighter">
                                                                        {showOnlyPending ? 'Everything Delivered!' : 'No records found'}
                                                                    </h4>
                                                                    <p className="text-slate-400 text-xs mt-1 font-medium italic">
                                                                        {showOnlyPending ? 'There are no pending containers in this specific view.' : 'No data available for the selected analysis.'}
                                                                    </p>
                                                                    {showOnlyPending && (
                                                                        <button 
                                                                            onClick={() => setShowOnlyPending(false)}
                                                                            className="mt-6 px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all"
                                                                        >
                                                                            View All Containers
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                        {displayedShipments.length > 100 && (
                                            <div className="px-6 py-4 text-center bg-slate-50 border-t border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Showing first 100 of {displayedShipments.length} records. Export to Excel to see all.
                                                </p>
                                            </div>
                                        )}
                                        </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-10 py-6 sm:flex sm:flex-row-reverse">
                        <button 
                            type="button" 
                            className="w-full inline-flex justify-center rounded-2xl border border-slate-200 shadow-sm px-10 py-3 bg-white text-sm font-black text-slate-900 hover:bg-slate-100 focus:outline-none transition-all sm:ml-3 sm:w-auto"
                            onClick={onClose}
                        >
                            CLOSE ANALYSIS
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartDetailsModal;
