
import React, { useMemo } from 'react';
import { Shipment } from '../types';

interface DailyLotBreakdownProps {
    shipments: Shipment[];
}

interface DaySummary {
    date: Date;
    label: string;
    totalContainers: number;
    lots: Array<{
        lotNumber: string;
        count: number;
    }>;
}

const DailyLotBreakdown: React.FC<DailyLotBreakdownProps> = ({ shipments }) => {
    const dailyData = useMemo(() => {
        const groups: Record<string, DaySummary> = {};

        shipments.forEach(s => {
            if (!s.deliveryByd) return;

            const d = new Date(s.deliveryByd);
            d.setHours(0, 0, 0, 0);
            const key = d.toISOString().split('T')[0];

            if (!groups[key]) {
                groups[key] = {
                    date: d,
                    label: d.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric' 
                    }),
                    totalContainers: 0,
                    lots: []
                };
            }

            groups[key].totalContainers++;
            
            const lotId = s.lotNumber || 'No Lot';
            const existingLot = groups[key].lots.find(l => l.lotNumber === lotId);
            if (existingLot) {
                existingLot.count++;
            } else {
                groups[key].lots.push({ lotNumber: lotId, count: 1 });
            }
        });

        return Object.values(groups)
            .sort((a, b) => b.date.getTime() - a.date.getTime()) // Newest first
            .slice(0, 10); // Show last 10 operational days
    }, [shipments]);

    if (dailyData.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="material-icons text-red-600">inventory_2</span>
                        Daily Throughput by Lot (DI)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Analyzing shipment volume composition by batch ID
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyData.map((day, idx) => (
                    <div key={idx} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    {day.date.toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : 'Operational Date'}
                                </span>
                                <h4 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-red-600 transition-colors">
                                    {day.label}
                                </h4>
                            </div>
                            <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex flex-col items-center min-w-[70px]">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Total</span>
                                <span className="text-xl font-black leading-none">{day.totalContainers}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {day.lots.sort((a,b) => b.count - a.count).map((lot, lIdx) => (
                                <div key={lIdx} className="inline-flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                    <span className="px-3 py-1.5 text-[10px] font-black text-slate-600 border-r border-slate-100">
                                        {lot.lotNumber}
                                    </span>
                                    <span className="px-3 py-1.5 text-[11px] font-black text-white bg-red-600">
                                        {lot.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="flex justify-center pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">
                    Displaying last 10 operational cycles
                </p>
            </div>
        </div>
    );
};

export default DailyLotBreakdown;