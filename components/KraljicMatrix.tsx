
import React from 'react';
import { ChartData, Shipment } from '../types';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
    ReferenceLine
} from 'recharts';
import { currencyFormatter } from '../utils/formatters';

interface KraljicMatrixProps {
    data: ChartData;
    shipments: Shipment[];
}

const KraljicMatrix: React.FC<KraljicMatrixProps> = ({ data, shipments }) => {
    const { kraljicMatrix } = data;

    if (!kraljicMatrix || kraljicMatrix.length === 0) {
        return (
            <div className="bg-white p-12 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                <span className="material-icons text-slate-300 text-6xl mb-4">grid_view</span>
                <h3 className="text-xl font-bold text-slate-600">No data for Kraljic Matrix</h3>
                <p className="text-slate-400 mt-2">Upload data with cargo models and lead times to see the strategic classification.</p>
            </div>
        );
    }

    const avgImpact = kraljicMatrix.reduce((sum, item) => sum + item.impact, 0) / kraljicMatrix.length;
    const avgRisk = kraljicMatrix.reduce((sum, item) => sum + item.risk, 0) / kraljicMatrix.length;

    const quadrantColors = {
        'Strategic': '#ef4444',   // Red - High Risk, High Impact
        'Leverage': '#3b82f6',    // Blue - Low Risk, High Impact
        'Bottleneck': '#f59e0b',  // Amber - High Risk, Low Impact
        'Non-critical': '#94a3b8' // Slate - Low Risk, Low Impact
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
                    <p className="text-sm font-black text-slate-800 mb-1">{data.name}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{data.quadrant}</p>
                    <div className="space-y-1">
                        <p className="text-xs text-slate-600 flex justify-between gap-4">
                            <span>Impact (Cost):</span>
                            <span className="font-bold">{currencyFormatter.format(data.impact)}</span>
                        </p>
                        <p className="text-xs text-slate-600 flex justify-between gap-4">
                            <span>Risk (Lead Time):</span>
                            <span className="font-bold">{data.risk.toFixed(1)} days</span>
                        </p>
                        <p className="text-xs text-slate-600 flex justify-between gap-4">
                            <span>Volume:</span>
                            <span className="font-bold">{data.volume} CNTR</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kraljic Strategic Matrix</h2>
                    <p className="text-slate-500 text-sm">Strategic classification of cargo models based on supply risk and profit impact.</p>
                </div>
                <div className="flex gap-2">
                    {Object.entries(quadrantColors).map(([name, color]) => (
                        <div key={name} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Matrix Chart */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative">
                {/* Quadrant Labels Background */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 p-8 pointer-events-none opacity-[0.03]">
                    <div className="border-r border-b border-slate-900 flex items-center justify-center">
                        <span className="text-4xl font-black uppercase rotate-[-45deg]">Leverage</span>
                    </div>
                    <div className="border-b border-slate-900 flex items-center justify-center">
                        <span className="text-4xl font-black uppercase rotate-[-45deg]">Strategic</span>
                    </div>
                    <div className="border-r border-slate-900 flex items-center justify-center">
                        <span className="text-4xl font-black uppercase rotate-[-45deg]">Non-critical</span>
                    </div>
                    <div className="flex items-center justify-center">
                        <span className="text-4xl font-black uppercase rotate-[-45deg]">Bottleneck</span>
                    </div>
                </div>

                <div className="h-[500px] relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis 
                                type="number" 
                                dataKey="risk" 
                                name="Supply Risk" 
                                unit="d" 
                                label={{ value: 'Supply Risk (Avg Lead Time)', position: 'bottom', offset: 0, fontSize: 12, fontWeight: 800, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            />
                            <YAxis 
                                type="number" 
                                dataKey="impact" 
                                name="Profit Impact" 
                                unit="$" 
                                label={{ value: 'Profit Impact (Total Cost)', angle: -90, position: 'left', fontSize: 12, fontWeight: 800, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            />
                            <ZAxis type="number" dataKey="volume" range={[100, 1000]} name="Volume" />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Reference Lines for Quadrants */}
                            <ReferenceLine x={avgRisk} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Avg Risk', position: 'top', fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                            <ReferenceLine y={avgImpact} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Avg Impact', position: 'right', fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />

                            <Scatter name="Cargo Models" data={kraljicMatrix}>
                                {kraljicMatrix.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={quadrantColors[entry.quadrant]} />
                                ))}
                                <LabelList dataKey="name" position="top" style={{ fontSize: '10px', fontWeight: 800, fill: '#475569' }} offset={10} />
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quadrant Breakdown Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {['Strategic', 'Leverage', 'Bottleneck', 'Non-critical'].map((q) => {
                    const items = kraljicMatrix.filter(item => item.quadrant === q);
                    if (items.length === 0) return null;

                    return (
                        <div key={q} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between" style={{ borderLeft: `4px solid ${quadrantColors[q as keyof typeof quadrantColors]}` }}>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">{q} Items</h4>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{items.length} Models</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-50 z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</th>
                                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cost</th>
                                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lead Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {items.map((item) => (
                                            <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 text-xs font-bold text-slate-700">{item.name}</td>
                                                <td className="px-6 py-3 text-xs font-mono font-bold text-slate-500 text-right">{currencyFormatter.format(item.impact)}</td>
                                                <td className="px-6 py-3 text-xs font-bold text-slate-600 text-right">{item.risk.toFixed(1)}d</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KraljicMatrix;
