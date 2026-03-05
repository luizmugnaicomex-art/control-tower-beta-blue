
import React, { useMemo, useState } from 'react';
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
    LabelList
} from 'recharts';
import { GoogleGenAI } from '@google/genai';
import { Shipment, WarehouseContract } from '../types';
import { currencyFormatter } from '../utils/formatters';
import { WAREHOUSE_CONTRACTS, INITIAL_FREIGHT_ROUTES } from '../constants';

interface ScenarioChartProps {
    shipments: Shipment[];
}

const ScenarioChart: React.FC<ScenarioChartProps> = ({ shipments }) => {
    const [aiAudit, setAiAudit] = useState<string>('');
    const [isAuditing, setIsAuditing] = useState(false);

    const { 
        data, 
        isEstimated, 
        currentTotal, 
        benchmarkTotal,
        savingsPotential 
    } = useMemo(() => {
        let actualTotal = 0;
        let benchTotal = 0;
        let totalTax = 0;
        let totalExtra = 0;

        shipments.forEach(s => {
            // 1. Calculate Actuals (if present in file)
            actualTotal += (s.totalCost || 0);
            totalTax += (s.taxCost || 0);
            totalExtra += (s.extraCost || 0) + (s.demurrageCost || 0);

            // 2. Calculate Benchmarks (Estimation)
            // A) Transport Estimation
            const bwUpper = (s.bondedWarehouse || '').toUpperCase();
            let routeId = "TECON_FACTORY";
            if (bwUpper.includes("INTERMAR")) routeId = "INTERMAR_FACTORY";
            else if (bwUpper.includes("TPC")) routeId = "TPC_FACTORY";
            else if (bwUpper.includes("CLIA") || bwUpper.includes("EMP")) routeId = "CLIA_FACTORY";

            const route = INITIAL_FREIGHT_ROUTES.find(r => r.id === routeId);
            // Default to the cheapest available in the benchmark for "Ideal" scenario
            const prices = Object.values(route?.prices || {}).filter((p): p is number => p !== null);
            const transportBench = prices.length > 0 ? Math.min(...prices) : 0;

            // B) Warehouse Estimation (Assuming 250k cargo value ref for benchmark)
            let contractId = "TECON";
            if (bwUpper.includes("INTERMAR")) contractId = "INTERMARITIMA";
            else if (bwUpper.includes("TPC")) contractId = "TPC";
            else if (bwUpper.includes("CLIA") || bwUpper.includes("EMP")) contractId = "CLIA_EMP";
            
            const contract = WAREHOUSE_CONTRACTS.find(c => c.id === contractId);
            let warehouseBench = 0;
            if (contract) {
                const days = s.totalClearanceTime || 10;
                const periods = Math.ceil(days / contract.periodDays);
                const storage = Math.max(250000 * contract.storagePct[0], contract.minRates[0]) * periods;
                warehouseBench = storage + contract.handlingFee + contract.scanningFee + contract.presenceFee;
            }

            benchTotal += (transportBench + warehouseBench);
        });

        const isEstimated = actualTotal === 0;
        
        // Final Chart Data
        const chartData = [
            { 
                name: isEstimated ? 'Estimated Spend' : 'Actual Total Spent', 
                value: isEstimated ? benchTotal * 1.15 : actualTotal, // +15% buffer for estimates
                color: isEstimated ? '#64748b' : '#DC2626' 
            },
            { 
                name: 'Benchmark Target', 
                value: benchTotal, 
                color: '#16A34A' 
            },
            { 
                name: 'Clean Scenario (No Extras)', 
                value: isEstimated ? benchTotal : Math.max(0, actualTotal - totalExtra), 
                color: '#2563EB' 
            }
        ];

        return { 
            data: chartData, 
            isEstimated, 
            currentTotal: actualTotal || benchTotal * 1.15,
            benchmarkTotal: benchTotal,
            savingsPotential: isEstimated ? 0 : actualTotal - benchTotal
        };
    }, [shipments]);

    const handleAiAudit = async () => {
        setIsAuditing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
            Você é um Auditor Financeiro Senior de Logística.
            Analise estes números da BYD:
            - Gasto Total (Atual): ${currencyFormatter.format(currentTotal)}
            - Gasto Alvo (Benchmark): ${currencyFormatter.format(benchmarkTotal)}
            - Diferença: ${currencyFormatter.format(currentTotal - benchmarkTotal)}
            - Volume: ${shipments.length} containers.
            - Status do Arquivo: ${isEstimated ? "FALTANDO DADOS FINANCEIROS (USANDO ESTIMATIVAS)" : "DADOS REAIS DISPONÍVEIS"}.

            Explique por que existe essa diferença (vazamento de custo) e dê 3 recomendações rápidas de economia baseadas em negociação com armadores (demurrage) e terminais (armazenagem).
            Seja direto e use tom executivo. Português Brasil.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            setAiAudit(response.text || '');
        } catch (e) {
            setAiAudit("Erro ao conectar com o Auditor IA.");
        } finally {
            setIsAuditing(false);
        }
    };

    if (shipments.length === 0) return null;

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                        Cost Analysis & Estimation
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">
                        {isEstimated ? 'Simulated Projections (Missing File Data)' : 'Live Operational Audit'}
                    </p>
                </div>
                <button 
                    onClick={handleAiAudit}
                    disabled={isAuditing}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg disabled:opacity-50"
                >
                    <span className="material-icons text-sm">{isAuditing ? 'sync' : 'security'}</span>
                    {isAuditing ? 'Auditing...' : 'Run Financial Audit'}
                </button>
            </div>

            {/* Insight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Gap vs Target</p>
                    <h4 className={`text-2xl font-black ${savingsPotential > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {currencyFormatter.format(Math.abs(savingsPotential))}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium italic">
                        {savingsPotential > 0 ? 'Unnecessary leakage detected' : 'Operating within benchmark efficiency'}
                    </p>
                </div>
                <div className={`p-5 rounded-3xl border ${isEstimated ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Data Reliability Score</p>
                    <h4 className={`text-2xl font-black ${isEstimated ? 'text-amber-600' : 'text-blue-600'}`}>
                        {isEstimated ? 'Estimated' : 'High Accuracy'}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium italic">
                        {isEstimated ? 'Projected based on contract rates' : 'Validated by uploaded invoice data'}
                    </p>
                </div>
            </div>

            {aiAudit && (
                <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-icons text-6xl">query_stats</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-amber-400">
                        <span className="material-icons text-sm">auto_awesome</span>
                        <h5 className="text-[10px] font-black uppercase tracking-widest">AI Financial Intelligence Report</h5>
                    </div>
                    <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-line font-medium">
                        {aiAudit}
                    </div>
                </div>
            )}

            <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis 
                            type="number" 
                            hide 
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={160}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [currencyFormatter.format(value), 'Cost']}
                        />
                        <Bar 
                            dataKey="value" 
                            radius={[0, 12, 12, 0]} 
                            barSize={32}
                            animationDuration={1500}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList 
                                dataKey="value" 
                                position="right" 
                                offset={10} 
                                formatter={(val: number) => currencyFormatter.format(val).replace('.00', '')}
                                style={{ fontSize: '11px', fontWeight: 900, fill: '#1e293b' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="pt-6 border-t border-slate-50 flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="material-icons text-xs">info</span>
                Estimation logic: transport target + storage target x lead time
            </div>
        </div>
    );
};

export default ScenarioChart;
