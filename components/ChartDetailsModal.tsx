
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
}

const ChartDetailsModal: React.FC<ChartDetailsModalProps> = ({ isOpen, onClose, weekLabel, shipments, avgDrainRate = 1 }) => {
    const [showOnlyPending, setShowOnlyPending] = useState(false);

    const displayedShipments = useMemo(() => {
        return showOnlyPending ? shipments.filter(s => !s.deliveryByd) : shipments;
    }, [shipments, showOnlyPending]);

    const isDemurrageView = weekLabel.toLowerCase().includes('demurrage') || weekLabel.toLowerCase().includes('risk');
    const isClearanceView = weekLabel.toLowerCase().includes('clearance') || weekLabel.toLowerCase().includes('customs');
    const isCargoReadyView = weekLabel.toLowerCase().includes('cargo ready');
    const isProjectedView = weekLabel.toLowerCase().includes('projected');

    const totalCostInView = useMemo(() => {
        if (!isOpen) return 0;
        if (isProjectedView) {
            const todayUTC = new Date();
            todayUTC.setHours(0,0,0,0);
            return shipments.reduce((sum, s, index) => {
                const startDate = s.cargoReadyDate || s.ata;
                if (!startDate) return sum;
                const daysAlreadyInBacklog = (todayUTC.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                const estimatedDaysToDrain = index / avgDrainRate;
                const projectedDays = Math.ceil(daysAlreadyInBacklog + estimatedDaysToDrain);
                const contract = getContractForWarehouse(s.bondedWarehouse);
                const cost = calculateWarehouseCost(contract, DEFAULT_CARGO_VALUE, projectedDays, 1);
                return sum + cost.total;
            }, 0);
        }
        return shipments.reduce((sum, s) => sum + (isDemurrageView ? s.demurrageCost : (s.totalCost || 0)), 0);
    }, [isOpen, shipments, isDemurrageView, isProjectedView, avgDrainRate]);

    const { pendingCount, lateShipments } = useMemo(() => {
        if (!isOpen) return { pendingCount: 0, lateShipments: 0 };
        return {
            pendingCount: shipments.filter(s => !s.deliveryByd).length,
            lateShipments: shipments.filter(s => s.clientDeliveryVariance !== null && s.clientDeliveryVariance > 0).length
        };
    }, [isOpen, shipments]);

    const tableData = useMemo(() => {
        if (!isOpen) return [];
        const todayUTC = new Date();
        todayUTC.setHours(0,0,0,0);

        return displayedShipments.map((s, idx) => {
            let projectedCost = '-';
            let currentAge = '-';
            
            if (isProjectedView) {
                const start = s.cargoReadyDate || s.ata;
                if (start) {
                    const daysAlreadyInBacklog = (todayUTC.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                    const estimatedDaysToDrain = idx / avgDrainRate;
                    const projectedDays = Math.ceil(daysAlreadyInBacklog + estimatedDaysToDrain);
                    const contract = getContractForWarehouse(s.bondedWarehouse);
                    const cost = calculateWarehouseCost(contract, DEFAULT_CARGO_VALUE, projectedDays, 1);
                    projectedCost = currencyFormatter.format(cost.total).replace('.00','');
                    currentAge = `${Math.floor(daysAlreadyInBacklog)} Days`;
                }
            }
            
            return {
                ...s,
                projectedCost,
                currentAge
            };
        });
    }, [isOpen, displayedShipments, isProjectedView, avgDrainRate]);

    if (!isOpen) return null;

    const count = shipments.length;

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
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-[2rem] text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full border border-slate-100 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white px-8 pt-8 pb-4 sm:p-10 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight" id="modal-title">
                                        {weekLabel}
                                    </h3>
                                    <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors">
                                        <span className="material-icons text-3xl">close</span>
                                    </button>
                                </div>
                                
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
                                                    ) : isCargoReadyView ? (
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
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{s.freeTimeDate ? s.freeTimeDate.toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{s.actualDepotReturnDate ? s.actualDepotReturnDate.toLocaleDateString() : 'Pending'}</td>
                                                                    <td className="px-6 py-4 text-sm font-black text-right text-red-600">
                                                                        {s.demurrageCost > 0 ? currencyFormatter.format(s.demurrageCost) : '-'}
                                                                    </td>
                                                                </>
                                                            ) : isClearanceView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{s.ata ? s.ata.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{s.channelDate ? s.channelDate.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-right text-slate-900">
                                                                        {s.dateNF ? s.dateNF.toLocaleDateString() : 'In Process'}
                                                                    </td>
                                                                </>
                                                            ) : isCargoReadyView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{s.ata ? s.ata.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{s.cargoReadyDate ? s.cargoReadyDate.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-right text-slate-900">
                                                                        {s.estimatedDelivery ? s.estimatedDelivery.toLocaleDateString() : '-'}
                                                                    </td>
                                                                </>
                                                            ) : isProjectedView ? (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">
                                                                        {(s.cargoReadyDate || s.ata)?.toLocaleDateString() || '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">
                                                                        {s.currentAge}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm font-black text-right text-orange-600">
                                                                        {s.projectedCost}
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{s.estimatedDelivery ? s.estimatedDelivery.toLocaleDateString() : '-'}</td>
                                                                    <td className="px-6 py-4 text-xs font-black text-slate-800">{s.deliveryByd ? s.deliveryByd.toLocaleDateString() : '-'}</td>
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
                                                        <td colSpan={10} className="px-6 py-32 text-center">
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
