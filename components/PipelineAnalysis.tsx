
import React from 'react';
import { PipelineWeek } from '../types';

interface PipelineAnalysisProps {
    data: PipelineWeek[];
    onWeekClick: (week: PipelineWeek) => void;
}

const PipelineAnalysis: React.FC<PipelineAnalysisProps> = ({ data, onWeekClick }) => {
    if (!data || data.length === 0) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PRAZO VENCIDO': return 'bg-red-50 text-red-600 border-red-100';
            case 'TIME COLLISION': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'SAFE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.15em] flex items-center gap-2">
                        <span className="material-icons text-indigo-600">view_week</span>
                        PIPELINE (WK) — VOLUME + TIME COLLISION
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                        Arrival forecast vs processing capacity bottlenecks
                    </p>
                </div>
                <div className="flex gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-6 py-2 rounded-2xl">
                    <span>GATE: 170/DIA</span>
                    <span className="opacity-30">|</span>
                    <span>FACTORY: 150/DIA</span>
                    <span className="opacity-30">|</span>
                    <span className="text-slate-800">GOAL: 10 DIAS</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <th className="px-8 py-4">Periodo (ETA)</th>
                            <th className="px-6 py-4">Navios</th>
                            <th className="px-6 py-4 text-center">Volume Total</th>
                            <th className="px-6 py-4 text-center">Pickup Status</th>
                            <th className="px-6 py-4 text-center">Drain Days (Gate)</th>
                            <th className="px-6 py-4 text-center">Drain Days (Factory)</th>
                            <th className="px-8 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((week, idx) => {
                            const isCompleted = week.deliveredCount === week.volume && week.volume > 0;
                            const pickupPercentage = week.volume > 0 ? (week.deliveredCount / week.volume) * 100 : 0;

                            return (
                                <tr 
                                    key={idx} 
                                    onClick={() => {
                                        console.log("Week clicked:", week);
                                        onWeekClick(week);
                                    }}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                >
                                    <td className="px-8 py-5 font-black text-slate-800 text-sm">{week.period}</td>
                                    <td className="px-6 py-5 text-[11px] font-bold text-slate-500 max-w-[200px] truncate">
                                        {week.vessels.length > 0 ? week.vessels.join(', ') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="text-sm font-black text-indigo-600 group-hover:scale-110 transition-transform inline-block underline decoration-dotted">
                                            {week.volume}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 min-w-[150px]">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center px-1">
                                                <span className={`text-[10px] font-black uppercase ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {isCompleted ? 'Completed ✓' : `${week.deliveredCount} Delivered`}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-400">
                                                    {week.pendingCount > 0 ? `${week.pendingCount} Pending` : ''}
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${pickupPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center font-black text-slate-900 text-sm">
                                        {week.drainDaysGate}
                                    </td>
                                    <td className="px-6 py-5 text-center font-black text-slate-900 text-sm">
                                        {week.drainDaysFactory}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black border uppercase ${getStatusColor(week.status)}`}>
                                            {week.status === 'TIME COLLISION' ? `TIME COLLISION (150/D)` : week.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-50">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Practical Logic Applied</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <div className="flex items-start gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                        <span className="text-indigo-600 font-black">•</span>
                        <span>Time collision = volume ok, but factory cap breaks the week (150/day bottleneck).</span>
                    </div>
                    <div className="flex items-start gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                        <span className="text-indigo-600 font-black">•</span>
                        <span>Bonded dwell shows clearance + scheduling health (not just stock).</span>
                    </div>
                    <div className="flex items-start gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                        <span className="text-indigo-600 font-black">•</span>
                        <span>Free time drives priority queue and demurrage defense.</span>
                    </div>
                    <div className="flex items-start gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                        <span className="text-indigo-600 font-black">•</span>
                        <span>VESSEL IMPACT (BONDED & BUFFER) simulates day-by-day throughput.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PipelineAnalysis;
