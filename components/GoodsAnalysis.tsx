
import React from 'react';
import { ChartData, Shipment } from '../types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
    PieChart,
    Pie
} from 'recharts';
import { currencyFormatter } from '../utils/formatters';

interface GoodsAnalysisProps {
    data: ChartData;
    shipments: Shipment[];
}

const GoodsAnalysis: React.FC<GoodsAnalysisProps> = ({ data, shipments }) => {
    const pqrSummary = data.pqrAnalysis.reduce((acc, item) => {
        acc[item.classification] = (acc[item.classification] || 0) + item.value;
        return acc;
    }, {} as Record<string, number>);

    const pieData = [
        { name: 'P (Popular)', value: pqrSummary['P'] || 0, color: '#10B981' },
        { name: 'Q (Quantity)', value: pqrSummary['Q'] || 0, color: '#F59E0B' },
        { name: 'R (Rare)', value: pqrSummary['R'] || 0, color: '#94A3B8' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Goods & Inventory Analysis</h2>
                    <p className="text-slate-500 text-sm">PQR classification based on shipment frequency and volume.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-emerald-100 p-2 rounded-xl">
                            <span className="material-icons text-emerald-600">inventory</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Models</p>
                            <p className="text-xl font-black text-slate-800">{data.pqrAnalysis.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-widest">Category P</span>
                            <span className="text-xs font-bold text-slate-400">Popular / High Frequency</span>
                        </div>
                        <p className="text-4xl font-black text-slate-800 mb-1">{pqrSummary['P'] || 0}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Containers</p>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${((pqrSummary['P'] || 0) / shipments.length * 100).toFixed(1)}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase tracking-widest">Category Q</span>
                            <span className="text-xs font-bold text-slate-400">Quantity / Medium Frequency</span>
                        </div>
                        <p className="text-4xl font-black text-slate-800 mb-1">{pqrSummary['Q'] || 0}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Containers</p>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${((pqrSummary['Q'] || 0) / shipments.length * 100).toFixed(1)}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg uppercase tracking-widest">Category R</span>
                            <span className="text-xs font-bold text-slate-400">Rare / Low Frequency</span>
                        </div>
                        <p className="text-4xl font-black text-slate-800 mb-1">{pqrSummary['R'] || 0}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Containers</p>
                        <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400" style={{ width: `${((pqrSummary['R'] || 0) / shipments.length * 100).toFixed(1)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">PQR Distribution</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Volume by classification</p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-8 mt-4">
                        {pieData.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Top 10 Models</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">By container volume</p>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.pqrAnalysis.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" name="Containers" radius={[0, 6, 6, 0]}>
                                    {data.pqrAnalysis.slice(0, 10).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={
                                            entry.classification === 'P' ? '#10B981' :
                                            entry.classification === 'Q' ? '#F59E0B' :
                                            '#94A3B8'
                                        } />
                                    ))}
                                    <LabelList dataKey="value" position="right" fontSize={10} fill="#1e293b" fontWeight={900} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table Section */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50">
                    <h3 className="text-lg font-black text-slate-800">Goods Detail Matrix</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Comprehensive breakdown of all cargo models</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo Model</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Volume</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Share %</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">PQR</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Avg Lead Time</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.pqrAnalysis.map((item, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${
                                                item.classification === 'P' ? 'bg-emerald-500' :
                                                item.classification === 'Q' ? 'bg-amber-500' :
                                                'bg-slate-400'
                                            }`}></div>
                                            <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <span className="text-sm font-black text-slate-900">{item.value}</span>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-bold text-slate-500">{item.percentage}%</span>
                                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500" style={{ width: `${item.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                                            item.classification === 'P' ? 'bg-emerald-100 text-emerald-700' :
                                            item.classification === 'Q' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {item.classification}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <span className="text-sm font-bold text-slate-600">
                                            {item.avgLeadTime ? `${item.avgLeadTime.toFixed(1)}d` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <span className="text-sm font-mono font-bold text-slate-500">
                                            {currencyFormatter.format(item.totalCost)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GoodsAnalysis;
