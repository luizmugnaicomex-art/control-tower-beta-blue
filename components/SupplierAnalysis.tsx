
import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Shipment } from '../types';
import { currencyFormatter } from '../utils/formatters';

interface SupplierAnalysisProps {
    shipments: Shipment[];
}

interface SupplierMetrics {
    supplier: string;
    shipmentCount: number;
    totalCost: number;
    demurrageCost: number;
    extraCosts: number;
    costPerShipment: number;
}

const SupplierAnalysis: React.FC<SupplierAnalysisProps> = ({ shipments }) => {
    const [aiResponse, setAiResponse] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const metrics: SupplierMetrics[] = useMemo(() => {
        const grouped = shipments.reduce((acc, s) => {
            const key = s.carrier || 'Unknown';
            if (!acc[key]) {
                acc[key] = {
                    supplier: key,
                    shipmentCount: 0,
                    totalCost: 0,
                    demurrageCost: 0,
                    extraCosts: 0,
                    costPerShipment: 0,
                };
            }
            acc[key].shipmentCount++;
            acc[key].totalCost += s.totalCost || 0;
            acc[key].demurrageCost += s.demurrageCost || 0;
            acc[key].extraCosts += s.extraCost || 0;
            return acc;
        }, {} as Record<string, SupplierMetrics>);

        return (Object.values(grouped) as SupplierMetrics[])
            .map(m => ({
                ...m,
                costPerShipment:
                    m.shipmentCount > 0 ? m.totalCost / m.shipmentCount : 0,
            }))
            .sort((a, b) => b.totalCost - a.totalCost);
    }, [shipments]);

    const handleAiAnalysis = async () => {
        if (metrics.length === 0) return;

        setIsGenerating(true);
        setAiResponse('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const topSuppliers = metrics.slice(0, 20).map(m => ({
                name: m.supplier,
                volume: m.shipmentCount,
                totalSpent: m.totalCost,
                avgCost: Number(m.costPerShipment.toFixed(2)),
                demurrageSpent: m.demurrageCost,
            }));

            const prompt = `
Você é um Gerente de Logística & Finanças avaliando transportadoras / fornecedores para BYD.

Analise os Top 20 fornecedores/carriers abaixo (em JSON):

${JSON.stringify(topSuppliers)}

Com base em volume, custo total, custo médio por envio e demurrage, entregue a resposta **em Português (Brasil)**.

Para cada fornecedor, traga:
1. **Classificação**: MANter / RENEGOCIAR / REDUZIR EXPOSIÇÃO.
2. **Justificativa**: 1 frase, focando em eficiência de custo, alavancagem de volume e risco de demurrage.
3. **Estratégia**: Como usar esse fornecedor na nossa matriz (concentrar volume, reduzir lane específica, etc.).

Formate a resposta como uma lista de bullet points, bem objetiva.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            // Extract text output directly from GenerateContentResponse using the .text property.
            setAiResponse(response.text || 'Nenhuma resposta gerada.');
        } catch (error) {
            console.error(error);
            setAiResponse(
                'Erro ao gerar análise de IA. Verifique sua API key e tente novamente.'
            );
        } finally {
            setIsGenerating(false);
        }
    };

    if (shipments.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-sm text-gray-600">
                No data available for analysis.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800">
                            Supplier Cost & Performance Analysis
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Foco em custo total, demurrage e oportunidade de renegociação.
                        </p>
                    </div>
                    <button
                        onClick={handleAiAnalysis}
                        disabled={isGenerating}
                        className={`px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors flex items-center shadow-sm ${
                            isGenerating
                                ? 'bg-red-300 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        <span className="material-icons mr-2 text-base">
                            psychology
                        </span>
                        {isGenerating ? 'Analisando...' : 'Recomendação IA'}
                    </button>
                </div>

                {aiResponse && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                        <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                            <span className="material-icons text-sm mr-2">
                                auto_awesome
                            </span>
                            AI Strategic Summary
                        </h4>
                        <div className="prose prose-sm max-w-none whitespace-pre-line text-gray-800">
                            {aiResponse}
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                    Supplier / Carrier
                                </th>
                                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                    Shipments
                                </th>
                                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                    Total Cost
                                </th>
                                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                    Avg Cost / Shipment
                                </th>
                                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                    Demurrage
                                </th>
                                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                                    Extra Costs
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {metrics.map((m, idx) => {
                                const hasDemurrage = m.demurrageCost > 0;
                                const rowAccent = hasDemurrage
                                    ? 'border-l-4 border-red-500'
                                    : 'border-l-4 border-transparent';

                                return (
                                    <tr
                                        key={m.supplier}
                                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${rowAccent}`}
                                    >
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {m.supplier}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                                            {m.shipmentCount}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                                            {currencyFormatter.format(
                                                m.totalCost
                                            )}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                                            {currencyFormatter.format(
                                                m.costPerShipment
                                            )}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-red-600">
                                            {currencyFormatter.format(
                                                m.demurrageCost
                                            )}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                                            {currencyFormatter.format(
                                                m.extraCosts
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupplierAnalysis;
