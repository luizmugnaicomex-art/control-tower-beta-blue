
import React, { useMemo, useState } from 'react';
import { Shipment } from '../types';

interface OperationalLotGridProps {
    shipments: Shipment[];
    onLotClick: (model: string, dateStr: string, batchNumber: string) => void;
}

const OperationalLotGrid: React.FC<OperationalLotGridProps> = ({ shipments, onLotClick }) => {
    const [isMaximized, setIsMaximized] = useState(false);

    const { dates, models, grid } = useMemo(() => {
        const dateSet = new Set<string>();
        const modelSet = new Set<string>();
        
        // Use last operational days
        const deliveredOnly = shipments.filter(s => s.deliveryByd).sort((a, b) => a.deliveryByd!.getTime() - b.deliveryByd!.getTime());
        
        deliveredOnly.forEach(s => {
            const dateStr = s.deliveryByd!.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            dateSet.add(dateStr);
            modelSet.add(s.cargoModel);
        });

        const sortedDates = Array.from(dateSet).slice(-12); // Last 12 days
        const sortedModels = Array.from(modelSet).sort();
        
        const gridData: Record<string, Record<string, Array<{ batch: string; count: number }>>> = {};

        sortedModels.forEach(m => {
            gridData[m] = {};
            sortedDates.forEach(d => {
                gridData[m][d] = [];
            });
        });

        shipments.forEach(s => {
            if (!s.deliveryByd) return;
            const dateStr = s.deliveryByd.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            if (!sortedDates.includes(dateStr)) return;

            const existingBatch = gridData[s.cargoModel][dateStr].find(b => b.batch === s.batchNumber);
            if (existingBatch) {
                existingBatch.count++;
            } else {
                gridData[s.cargoModel][dateStr].push({ batch: s.batchNumber, count: 1 });
            }
        });

        return { dates: sortedDates, models: sortedModels, grid: gridData };
    }, [shipments]);

    if (dates.length === 0) return null;

    const isWeekend = (dateStr: string) => {
        const sample = shipments.find(s => s.deliveryByd?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) === dateStr);
        if (!sample || !sample.deliveryByd) return false;
        const day = sample.deliveryByd.getDay();
        return day === 0 || day === 6;
    };

    const renderGridTable = (maximized: boolean = false) => (
        <div className={`overflow-x-auto ${maximized ? 'h-full' : ''}`}>
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="sticky left-0 z-20 bg-slate-50/80 backdrop-blur-md px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100 min-w-[150px]">
                            MODEL
                        </th>
                        {dates.map(date => {
                            const weekend = isWeekend(date);
                            return (
                                <th 
                                    key={date} 
                                    className={`px-4 py-4 text-center text-sm font-black border-r border-slate-100 min-w-[120px] ${
                                        weekend ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                                    }`}
                                >
                                    {date}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {models.map(model => (
                        <tr key={model} className="border-b border-slate-50 group hover:bg-slate-50/30 transition-colors">
                            <td className={`sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-6 py-8 font-black text-slate-900 border-r border-slate-100 text-sm`}>
                                {model}
                            </td>
                            {dates.map(date => {
                                const lots = grid[model][date];
                                return (
                                    <td key={`${model}-${date}`} className="p-3 border-r border-slate-50 align-top">
                                        <div className={`flex flex-col gap-2 ${maximized ? 'min-h-[80px]' : 'min-h-[60px]'}`}>
                                            {lots.length > 0 ? (
                                                lots.map((lot, idx) => (
                                                    <button 
                                                        key={idx} 
                                                        onClick={() => onLotClick(model, date, lot.batch)}
                                                        className="flex items-center justify-between bg-slate-900 text-white rounded-xl px-3 py-2 shadow-sm shadow-slate-200 animate-in zoom-in-95 duration-300 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-left w-full group/lot"
                                                    >
                                                        <span className="text-[10px] font-black tracking-tight truncate mr-2">LOT {lot.batch}</span>
                                                        <span className="bg-red-600 text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 group-hover/lot:bg-white group-hover/lot:text-red-600 transition-colors">
                                                            {lot.count}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-10 transition-opacity">
                                                    <span className="material-icons text-slate-300">block</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <span className="material-icons text-emerald-500">grid_on</span>
                            Operational Lot Deployment Grid
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                            Click on a Lot to view specific container details
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-emerald-50 rounded-sm border border-emerald-200"></div>
                                <span className="text-[10px] font-black text-slate-400">WEEKDAY</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-50 rounded-sm border border-indigo-200"></div>
                                <span className="text-[10px] font-black text-slate-400">WEEKEND</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsMaximized(true)}
                            className="text-slate-300 hover:text-indigo-600 focus:outline-none p-2 hover:bg-indigo-50 rounded-xl transition-all no-export"
                            title="Maximize Grid"
                        >
                            <span className="material-icons text-xl">fullscreen</span>
                        </button>
                    </div>
                </div>

                {renderGridTable()}
                
                <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Scroll horizontally to view full operational timeline
                     </p>
                </div>
            </div>

            {/* Maximized Modal */}
            {isMaximized && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 sm:p-10 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-[1500px] h-full max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative border border-slate-200">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    <span className="material-icons text-emerald-500">grid_on</span>
                                    Full Deployment Matrix
                                </h2>
                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                    Historical Operational Cycles - 12 Day Window
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsMaximized(false)}
                                className="bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-3 rounded-2xl transition-all shadow-sm"
                            >
                                <span className="material-icons text-2xl">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto bg-slate-50/30">
                            {renderGridTable(true)}
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center px-10">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status Ready</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsMaximized(false)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all shadow-lg"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default OperationalLotGrid;
