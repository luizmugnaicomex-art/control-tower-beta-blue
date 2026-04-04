
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
    Legend,
    PieChart,
    Pie,
    AreaChart,
    Area
} from 'recharts';
import { currencyFormatter } from '../utils/formatters';

interface TcoAnalysisProps {
    data: ChartData;
    shipments: Shipment[];
}

const TcoAnalysis: React.FC<TcoAnalysisProps> = ({ data, shipments }) => {
    const { tcoBreakdown, tcoTrend } = data;

    const totalTco = tcoBreakdown.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Total Cost of Ownership (TCO)</h2>
                    <p className="text-slate-500 text-sm">Comprehensive breakdown of operational logistics costs.</p>
                </div>
                <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-lg ring-1 ring-slate-800">
                    <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1 tracking-widest">Total Operation Cost</p>
                    <p className="text-2xl font-black leading-none tracking-tighter">{currencyFormatter.format(totalTco)}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {tcoBreakdown.map((item) => (
                    <div key={item.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.name}</p>
                        <p className="text-xl font-black text-slate-800">{currencyFormatter.format(item.value)}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                            {totalTco > 0 ? ((item.value / totalTco) * 100).toFixed(1) : 0}% of total
                        </p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cost Breakdown Pie */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        <span className="material-icons text-blue-500">pie_chart</span>
                        Cost Distribution
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={tcoBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {tcoBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => currencyFormatter.format(value)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TCO Trend */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        <span className="material-icons text-emerald-500">trending_up</span>
                        Cost Trend by Week
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={tcoTrend}>
                                <defs>
                                    <linearGradient id="colorTco" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="period" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip 
                                    formatter={(value: number) => currencyFormatter.format(value)}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="tco" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTco)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown Chart */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <span className="material-icons text-indigo-500">bar_chart</span>
                    Weekly Cost Breakdown
                </h3>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tcoTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="period" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                                formatter={(value: number) => currencyFormatter.format(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="freight" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="taxes" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="extra" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="demurrage" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default TcoAnalysis;
