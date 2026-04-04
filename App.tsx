
import React, { useState, useMemo, useEffect } from "react";
import { useFreightData } from "./hooks/useFreightData";
import { RoutesTable } from "./components/RoutesTable";
import { CarrierCards } from "./components/CarrierCards";
import { InctConfigPanel } from "./components/InctConfigPanel";
import { WarehouseScenarioSummary } from "./components/WarehouseScenarioSummary";
import { TransportEstimative } from "./components/ProvisionControl";
import { WarehouseSimulation } from "./components/WarehouseSimulation";

// KPI Dashboard Imports
import FileUpload from "./components/FileUpload";
import KpiCard from "./components/KpiCard";
import DashboardFilters from "./components/DashboardFilters";
import ChartsGrid from "./components/ChartsGrid";
import ShipmentTable from "./components/ShipmentTable";
import SupplierAnalysis from "./components/SupplierAnalysis";
import ScenarioChart from "./components/ScenarioChart";
import ChartDetailsModal from "./components/ChartDetailsModal";
import DailyLotBreakdown from "./components/DailyLotBreakdown";
import OperationalLotGrid from "./components/OperationalLotGrid";
import PipelineAnalysis from "./components/PipelineAnalysis";
import GoodsAnalysis from "./components/GoodsAnalysis";
import TcoAnalysis from "./components/TcoAnalysis";
import KraljicMatrix from "./components/KraljicMatrix";

// Utils
import { processRawData, calculateDashboardData, toUTC, getISOWeek } from "./utils/dataProcessor";
import { currencyFormatter } from "./utils/formatters";
import { Shipment, SortConfig, PipelineWeek } from "./types";

type MainView = "performance" | "benchmark" | "estimative" | "warehouse_sim" | "goods_analysis" | "tco_analysis" | "kraljic_matrix";

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

export default function App() {
  const benchmark = useFreightData();
  const { activeTab, inct, justifications, containerQuantity, provision } = benchmark.state;

  const [mainView, setMainView] = useState<MainView>("performance");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriersList, setCarriersList] = useState<string[]>([]);
  const [analystsList, setAnalystsList] = useState<string[]>([]);
  const [cargosList, setCargosList] = useState<string[]>([]);
  const [containerTypesList, setContainerTypesList] = useState<string[]>([]);
  const [incotermsList, setIncotermsList] = useState<string[]>([]);
  const [romaneioStatusesList, setRomaneioStatusesList] = useState<string[]>([]);
  const [yearsList, setYearsList] = useState<number[]>([]);
  
  const [filters, setFilters] = useState({
    carriers: [] as string[],
    analysts: [] as string[],
    cargos: [] as string[],
    containerTypes: [] as string[],
    incoterms: [] as string[],
    romaneioStatuses: [] as string[],
    year: "all",
    period: "all",
    month: "all",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "ata", direction: "desc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalData, setModalData] = useState<{ isOpen: boolean; weekLabel: string; shipments: Shipment[]; groupedData?: Record<string, Record<string, string[]>> }>({
    isOpen: false,
    weekLabel: "",
    shipments: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (data: any[][]) => {
    try {
      const processed = processRawData(data);
      setShipments(processed.shipments);
      setCarriersList(processed.carriers);
      setAnalystsList(processed.analysts);
      setCargosList(processed.cargos);
      setContainerTypesList(processed.containerTypes);
      setIncotermsList(processed.incoterms);
      setRomaneioStatusesList(processed.romaneioStatuses);
      setYearsList(processed.years);
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleExportPPT = async () => {
    if (shipments.length === 0) return;
    setIsExporting(true);
    document.body.classList.add('is-exporting');

    try {
      // Robust library detection for different build environments
      const PptxGen = (window as any).PptxGenJS;
      const pptx = typeof PptxGen === 'function' ? new PptxGen() : new (PptxGen as any).default();
      
      pptx.layout = 'LAYOUT_16x9';

      // 1. Title Slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText("Logistics KPI Command Center", { 
        x: 0, y: '40%', w: '100%', align: 'center', fontSize: 36, bold: true, color: '363636', fontFace: 'Arial'
      });
      titleSlide.addText(`Executive Performance Report - ${new Date().toLocaleDateString()}`, { 
        x: 0, y: '55%', w: '100%', align: 'center', fontSize: 18, color: '888888', fontFace: 'Arial'
      });

      // Slide workspace dimensions (inches) for 16:9 is 10 x 5.625
      const SLIDE_W = 10;
      const SLIDE_H = 5.625;
      const MARGIN = 0.4;
      const MAX_W = SLIDE_W - (MARGIN * 2);
      const MAX_H = SLIDE_H - (MARGIN * 2);

      // Select sections to capture
      const sections = document.querySelectorAll('.export-section');
      
      for (const section of Array.from(sections)) {
        const canvas = await (window as any).html2canvas(section as HTMLElement, {
          scale: 2.5, // High resolution
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc: Document) => {
             // Find the specific element in the cloned document
             const elementId = section.getAttribute('id');
             const selector = elementId ? `#${elementId}` : '.export-section';
             const el = clonedDoc.querySelector(selector);
             
             if (el) {
                const htmlEl = el as HTMLElement;
                // Standardize layout for export
                htmlEl.style.width = '1200px';
                htmlEl.style.height = 'auto';
                htmlEl.style.padding = '40px';
                htmlEl.style.borderRadius = '0';
                htmlEl.style.boxShadow = 'none';
                htmlEl.style.border = 'none';
             }
          }
        });
        
        const imageData = canvas.toDataURL('image/png', 1.0);
        const slide = pptx.addSlide();

        // Calculate aspect ratio to prevent stretching
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const imgAspectRatio = canvasH / canvasW;

        let finalW = MAX_W;
        let finalH = MAX_W * imgAspectRatio;

        // If height is too much, scale down by height instead
        if (finalH > MAX_H) {
          finalH = MAX_H;
          finalW = MAX_H / imgAspectRatio;
        }
        
        // Center the image in the slide
        slide.addImage({ 
          data: imageData, 
          x: (SLIDE_W - finalW) / 2, 
          y: (SLIDE_H - finalH) / 2, 
          w: finalW, 
          h: finalH
        });
      }

      await pptx.writeFile({ fileName: `Logistics_Executive_Report_${new Date().toISOString().split('T')[0]}.pptx` });
    } catch (err) {
      console.error("PPT Export failed:", err);
      setError("Failed to generate PowerPoint presentation. Please check console for details.");
    } finally {
      setIsExporting(false);
      document.body.classList.remove('is-exporting');
    }
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const matchCarrier = filters.carriers.length === 0 || (s.carrier && filters.carriers.includes(s.carrier));
      const matchAnalyst = filters.analysts.length === 0 || (s.analyst && filters.analysts.includes(s.analyst));
      const matchCargo = filters.cargos.length === 0 || (s.cargo && filters.cargos.includes(s.cargo));
      const matchType = filters.containerTypes.length === 0 || (s.containerType && filters.containerTypes.includes(s.containerType));
      const matchIncoterm = filters.incoterms.length === 0 || (s.incoterm && filters.incoterms.includes(s.incoterm));
      const matchRomaneio = filters.romaneioStatuses.length === 0 || (s.madeRomaneio && filters.romaneioStatuses.includes(s.madeRomaneio));
      
      const date = s.deliveryByd || s.ata;
      const matchYear = filters.year === "all" || (date && date.getFullYear().toString() === filters.year);
      
      let matchPeriod = true;
      if (filters.period !== "all" && date) {
        const month = date.getMonth();
        if (filters.period === "H1") matchPeriod = month < 6;
        else if (filters.period === "H2") matchPeriod = month >= 6;
        else if (filters.period === "Q1") matchPeriod = month < 3;
        else if (filters.period === "Q2") matchPeriod = month >= 3 && month < 6;
        else if (filters.period === "Q3") matchPeriod = month >= 6 && month < 9;
        else if (filters.period === "Q4") matchPeriod = month >= 9;
      }

      const matchMonth = filters.month === "all" || (date && date.getMonth().toString() === filters.month);
      const matchSearch = !searchTerm || [s.containerNumber, s.carrier, s.vesselName, s.shipper, s.billOfLading].some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()));

      return matchCarrier && matchAnalyst && matchCargo && matchType && matchIncoterm && matchRomaneio && matchYear && matchPeriod && matchMonth && matchSearch;
    });
  }, [shipments, filters, searchTerm]);

  const sortedShipments = useMemo(() => {
    return [...filteredShipments].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA === valB) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      const res = valA < valB ? -1 : 1;
      return sortConfig.direction === "asc" ? res : -res;
    });
  }, [filteredShipments, sortConfig]);

  const { kpis, charts } = useMemo(() => calculateDashboardData(filteredShipments), [filteredShipments]);
  const paginatedShipments = sortedShipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetFilters = () => setFilters({ carriers: [], analysts: [], cargos: [], containerTypes: [], incoterms: [], romaneioStatuses: [], year: "all", period: "all", month: "all" });

  const handleLotClick = (model: string, dateLabel: string, batchNumber: string) => {
    const matchingShipments = filteredShipments.filter(s => {
      if (!s || !s.deliveryByd) return false;
      const sDateStr = s.deliveryByd.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      return sDateStr === dateLabel && s.batchNumber === batchNumber && s.cargoModel === model;
    });
    setModalData({
      isOpen: true,
      weekLabel: `LOT ${batchNumber} (${model}) - ${dateLabel}`,
      shipments: matchingShipments
    });
  };

  const handlePipelineWeekClick = (week: PipelineWeek) => {
    // Filter shipments that arrive in this specific ISO week
    const matchingShipments = filteredShipments.filter(s => {
        if (!s) return false;
        const date = s.ata || s.estimatedDelivery;
        if (!isValidDate(date)) return false;
        
        // Exact same logic as getISOWeek in dataProcessor.ts
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        if (!isValidDate(d)) return false;
        
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        
        return weekNo === week.weekNum && d.getUTCFullYear() === week.year;
    });

    setModalData({
        isOpen: true,
        weekLabel: `WEEK DRILLDOWN: ${week.period}`,
        shipments: matchingShipments
    });
  };

  // --- Drill-down Handlers for KPI Cards ---
  const handleDemurrageClick = () => {
    const demurrageShipments = filteredShipments.filter(s => s.demurrageCost > 0);
    setModalData({
      isOpen: true,
      weekLabel: "Demurrage Cost Analysis",
      shipments: demurrageShipments
    });
  };

  const handleOnTimeClick = () => {
    const onTimeShipments = filteredShipments.filter(s => s.deliveryByd && (s.clientDeliveryVariance || 0) <= 0);
    setModalData({
      isOpen: true,
      weekLabel: "On-Time Deliveries",
      shipments: onTimeShipments
    });
  };

  const handleAtRiskClick = () => {
    const atRiskShipments = filteredShipments.filter(s => s.detentionRisk !== null && s.detentionRisk > 0);
    setModalData({
      isOpen: true,
      weekLabel: "Containers at Detention Risk",
      shipments: atRiskShipments
    });
  };

  const handleFlaggedClick = () => {
    const todayUTC = new Date();
    todayUTC.setHours(0,0,0,0);
    const flaggedShipments = filteredShipments.filter(s => {
        if (s.actualDepotReturnDate || !s.freeTimeDate) return false;
        const freeTimeUTC = new Date(s.freeTimeDate);
        freeTimeUTC.setHours(0,0,0,0);
        const diffTime = freeTimeUTC.getTime() - todayUTC.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 15;
    });
    setModalData({
      isOpen: true,
      weekLabel: "Flagged Containers (15 Days to Free Time)",
      shipments: flaggedShipments
    });
  };

  const handleProjectedClick = () => {
    const todayUTC = toUTC(new Date());
    const avgDrainRate = parseFloat(kpis.avgWeekdayVolume) || 1;
    
    const backlog = filteredShipments.filter(s => !s.deliveryByd).sort((a, b) => {
        const dateA = a.cargoReadyDate || a.ata || new Date(0);
        const dateB = b.cargoReadyDate || b.ata || new Date(0);
        return dateA.getTime() - dateB.getTime();
    });

    const projectedShipments = backlog.filter((s, index) => {
        const startDate = s.cargoReadyDate || s.ata;
        if (!startDate) return false;
        const daysAlreadyInBacklog = (todayUTC.getTime() - toUTC(startDate).getTime()) / (1000 * 60 * 60 * 24);
        const estimatedDaysToDrain = index / avgDrainRate;
        return (daysAlreadyInBacklog + estimatedDaysToDrain) > 10;
    });

    setModalData({
      isOpen: true,
      weekLabel: "Projected > 10 Days in Backlog",
      shipments: projectedShipments
    });
  };

  const handleClearanceClick = () => {
    const clearanceShipments = filteredShipments.filter(s => s.totalClearanceTime !== null);
    setModalData({
      isOpen: true,
      weekLabel: "Customs Clearance Performance",
      shipments: clearanceShipments
    });
  };

  const goalPct = parseFloat(kpis.goalAchievementPct);
  const goalColor = goalPct >= 100 ? 'bg-emerald-500' : goalPct >= 85 ? 'bg-amber-500' : 'bg-red-500';
  const goalTextColor = goalPct >= 100 ? 'text-emerald-600' : goalPct >= 85 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className={`min-h-screen bg-[#f4f6fb] font-sans antialiased print:bg-white ${isExporting ? 'is-exporting' : ''}`}>
      {/* Top Banner Navigation */}
      <div className="bg-slate-900 text-white px-6 py-4 shadow-lg sticky top-0 z-50 flex items-center justify-between print:hidden no-export">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2 rounded-lg">
            <span className="material-icons text-white">dashboard</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Command Center</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Logistics & Supply Chain</p>
          </div>
        </div>

        <div className="flex bg-slate-800 rounded-xl p-1">
          <button 
            onClick={() => setMainView("performance")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'performance' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">analytics</span>
            Performance Insights
          </button>
          <button 
            onClick={() => setMainView("benchmark")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'benchmark' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">calculate</span>
            Benchmark & Estimator
          </button>
          <button 
            onClick={() => setMainView("estimative")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'estimative' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">payments</span>
            Transport Estimative
          </button>
          <button 
            onClick={() => setMainView("warehouse_sim")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'warehouse_sim' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">warehouse</span>
            Bonded Warehouse
          </button>
          <button 
            onClick={() => setMainView("goods_analysis")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'goods_analysis' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">inventory_2</span>
            Goods Analysis
          </button>
          <button 
            onClick={() => setMainView("tco_analysis")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'tco_analysis' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">monetization_on</span>
            TCO Analysis
          </button>
          <button 
            onClick={() => setMainView("kraljic_matrix")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${mainView === 'kraljic_matrix' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-icons text-sm">grid_view</span>
            Kraljic Matrix
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportPPT} 
            disabled={isExporting || shipments.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isExporting ? 'bg-slate-600 text-slate-300' : 'bg-red-600 hover:bg-red-700 text-white shadow-md'} disabled:opacity-50`}
          >
            <span className={`material-icons text-sm ${isExporting ? 'animate-spin' : ''}`}>
              {isExporting ? 'sync' : 'present_to_all'}
            </span>
            {isExporting ? 'Exporting...' : 'Export PPT'}
          </button>
          <button onClick={() => window.print()} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors">
            <span className="material-icons">print</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] p-6 lg:p-8 main-content w-full">
        
        {mainView === "performance" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 dashboard-container">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-export">
                <div className="flex items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Operational Analytics</h2>
                    <p className="text-slate-500 text-sm">Analyze carrier performance, costs, and lead times.</p>
                  </div>
                  {shipments.length > 0 && (
                    <div className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg ring-1 ring-slate-800">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1 tracking-widest">Global Data Vol</p>
                        <p className="text-xl font-black leading-none tracking-tighter">{kpis.totalShipments} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">CNTR</span></p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="print:hidden">
                   <FileUpload onFileUpload={handleFileUpload} onError={setError} setIsLoading={setIsLoading} />
                </div>
             </div>

             {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 text-red-700 text-sm no-export">
                  <span className="material-icons">error</span>
                  {error}
                </div>
             )}

             {shipments.length === 0 ? (
               <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 text-center no-export">
                  <span className="material-icons text-6xl text-slate-300 mb-4">cloud_upload</span>
                  <h3 className="text-xl font-bold text-slate-600">No data loaded yet</h3>
                  <p className="text-slate-400 max-w-xs mx-auto mt-2">Upload your logistics Excel file to unlock deep performance insights and AI analysis.</p>
               </div>
             ) : (
               <>
                 {/* Daily Goal Header Summary */}
                 <section id="goal-summary" className="export-section bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-2">
                       <div className="flex items-center gap-2">
                          <span className="material-icons text-amber-500">tour</span>
                          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Operational Daily Goal: {kpis.dailyGoalValue} CNTR</h3>
                       </div>
                       <div className="flex items-center justify-between">
                          <h4 className="text-3xl font-black text-slate-800">
                            {kpis.goalAchievementPct}% <span className="text-sm font-bold text-slate-400 ml-2">Achievement</span>
                          </h4>
                          <span className={`text-xs font-black uppercase ${goalTextColor}`}>
                            {goalPct >= 100 ? 'Excelence' : goalPct >= 85 ? 'Target Range' : 'Attention Required'}
                          </span>
                       </div>
                       <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${goalColor} transition-all duration-1000 ease-out shadow-sm`} style={{ width: `${Math.min(100, goalPct)}%` }}></div>
                       </div>
                    </div>
                    <div className="w-full md:w-auto flex items-center gap-4 px-6 border-l border-slate-100">
                       <div className="text-center bg-slate-50 px-5 py-2.5 rounded-[1.25rem] border border-slate-100 mr-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</p>
                          <p className="text-2xl font-black text-slate-900">{kpis.deliveredCount}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekday Total</p>
                          <p className="text-xl font-black text-slate-800">{kpis.totalWeekdayVolume}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekday Avg</p>
                          <p className="text-xl font-black text-slate-800">{kpis.avgWeekdayVolume}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekend Bonus</p>
                          <p className="text-xl font-black text-emerald-600">+{kpis.weekendBonusVolume}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Days</p>
                          <p className="text-xl font-black text-slate-800">{kpis.totalWeekdaysOperated}</p>
                       </div>
                    </div>
                 </section>

                  <section id="kpi-grid" className="export-section space-y-4 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="bg-white rounded-2xl p-6 border-t-4 border-blue-500 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">EM MAR (IN-TRANSIT)</div>
                        <div className="text-4xl font-black text-blue-600 mt-2">{kpis.inTransit} <span className="text-xs text-slate-400">FCL</span></div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-t-4 border-orange-500 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">PORTO / FISCAL</div>
                        <div className="text-4xl font-black text-orange-500 mt-2">{kpis.portFiscal} <span className="text-xs text-slate-400">FCL</span></div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-t-4 border-green-500 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">BONDED STOCK</div>
                        <div className="text-4xl font-black text-green-600 mt-2">{kpis.bondedStock} <span className="text-xs text-slate-400">FCL</span></div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-t-4 border-indigo-500 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL COVERAGE</div>
                        <div className="text-4xl font-black text-indigo-600 mt-2">{Math.floor((kpis.bondedStock + 300) / 160)} <span className="text-xs text-slate-400 font-bold uppercase">dias</span></div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-t-4 border-amber-500 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">FREE TIME ≤ 7d</div>
                        <div className="text-4xl font-black text-amber-600 mt-2">{kpis.ftRisk7d}</div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-t-4 border-red-500 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">FREE TIME ≤ 3d</div>
                        <div className="text-4xl font-black text-red-600 mt-2">{kpis.ftRisk3d}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-2xl p-6 border-l-4 border-slate-900 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">BUFFER COVERAGE</div>
                        <div className="text-3xl font-black text-slate-900 mt-2">{Math.round((300 / 160) * 10) / 10}<span className="text-xs text-slate-400 ml-1">days</span></div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1">buffer 300 / demand 160</div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-l-4 border-indigo-600 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">DAYS TO EMPTY BONDED (GATE)</div>
                        <div className="text-3xl font-black text-indigo-700 mt-2">{Math.round((kpis.bondedStock / 170) * 10) / 10}<span className="text-xs text-slate-400 ml-1">days</span></div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1">bonded {kpis.bondedStock} / gate 170</div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-l-4 border-red-600 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">DAYS TO EMPTY BONDED (FACTORY)</div>
                        <div className="text-3xl font-black text-red-700 mt-2">{Math.round((kpis.bondedStock / 150) * 10) / 10}<span className="text-xs text-slate-400 ml-1">days</span></div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1">bonded {kpis.bondedStock} / factory 150</div>
                      </div>

                      <div className="bg-white rounded-2xl p-6 border-l-4 border-amber-500 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase">AVG BONDED DWELL</div>
                        <div className="text-3xl font-black text-amber-700 mt-2">{kpis.bondedDwellCount ? Math.round((kpis.bondedDwellSum / kpis.bondedDwellCount) * 10) / 10 : 0}<span className="text-xs text-slate-400 ml-1">days</span></div>
                        <div className="text-[10px] text-slate-400 font-black uppercase mt-1">oldest: {kpis.bondedDwellMax}d | {'>'}7d: {kpis.bondedDwellGt7} | {'>'}10d: {kpis.bondedDwellGt10}</div>
                      </div>
                    </div>
                  </section>

                  <section id="tco-summary" className="export-section grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL TCO</div>
                      <div className="text-2xl font-black mt-2">{currencyFormatter.format(kpis.totalTco)}</div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FREIGHT COST</div>
                      <div className="text-2xl font-black text-slate-800 mt-2">{currencyFormatter.format(kpis.totalFreight)}</div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAXES & DUTIES</div>
                      <div className="text-2xl font-black text-slate-800 mt-2">{currencyFormatter.format(kpis.totalTaxes)}</div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DEMURRAGE & EXTRA</div>
                      <div className="text-2xl font-black text-red-600 mt-2">{currencyFormatter.format(kpis.totalDemurrage + kpis.totalExtra)}</div>
                    </div>
                  </section>

                 <div className="no-export">
                   <DashboardFilters 
                      carriers={carriersList} analysts={analystsList} cargos={cargosList} containerTypes={containerTypesList} incoterms={incotermsList} romaneioStatuses={romaneioStatusesList} years={yearsList}
                      selectedCarriers={filters.carriers} selectedAnalysts={filters.analysts} selectedCargos={filters.cargos} selectedContainerTypes={filters.containerTypes} selectedIncoterms={filters.incoterms} selectedRomaneioStatuses={filters.romaneioStatuses}
                      selectedYear={filters.year} selectedPeriod={filters.period} selectedMonth={filters.month}
                      onCarrierChange={(val) => setFilters(f => ({...f, carriers: val}))}
                      onAnalystChange={(val) => setFilters(f => ({...f, analysts: val}))}
                      onCargoChange={(val) => setFilters(f => ({...f, cargos: val}))}
                      onContainerTypeChange={(val) => setFilters(f => ({...f, containerTypes: val}))}
                      onIncotermChange={(val) => setFilters(f => ({...f, incoterms: val}))}
                      onRomaneioStatusChange={(val) => setFilters(f => ({...f, romaneioStatuses: val}))}
                      onYearChange={(val) => setFilters(f => ({...f, year: val}))}
                      onPeriodChange={(val) => setFilters(f => ({...f, period: val}))}
                      onMonthChange={(val) => setFilters(f => ({...f, month: val}))}
                      onReset={resetFilters}
                   />
                 </div>

                 {/* Pipeline Analysis moved below filters */}
                 <section id="pipeline-analysis" className="export-section">
                    <PipelineAnalysis data={charts.pipeline} onWeekClick={handlePipelineWeekClick} />
                 </section>

                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <div className="chart-wrapper">
                            {mounted && (
                               <ChartsGrid 
                                 data={charts} 
                                 shipments={filteredShipments}
                                 onLeadTimeClick={(d) => {
                                   const targetDate = d.date ? new Date(d.date).toISOString().split('T')[0] : null;
                                   if (!targetDate) return;
                                   const matching = filteredShipments.filter(s => {
                                     if (!s.deliveryByd) return false;
                                     return s.deliveryByd.toISOString().split('T')[0] === targetDate;
                                   });
                                   setModalData({ isOpen: true, weekLabel: d.label, shipments: matching });
                                 }} 
                                 onCargoReadyClick={(d) => {
                                   const targetDate = d.date ? new Date(d.date).toISOString().split('T')[0] : null;
                                   if (!targetDate) return;
                                   const matching = filteredShipments.filter(s => {
                                     if (!s.cargoReadyDate) return false;
                                     return s.cargoReadyDate.toISOString().split('T')[0] === targetDate;
                                   });
                                   setModalData({
                                     isOpen: true,
                                     weekLabel: `Cargo Ready - ${d.label}`,
                                     shipments: matching
                                   });
                                 }}
                                 onAtaClick={(d) => {
                                   const targetDate = d.date ? new Date(d.date).toISOString().split('T')[0] : null;
                                   if (!targetDate) return;
                                   const matching = filteredShipments.filter(s => {
                                     if (!s.ata) return false;
                                     return s.ata.toISOString().split('T')[0] === targetDate;
                                   });
                                   setModalData({
                                     isOpen: true,
                                     weekLabel: `Vessel Arrivals (ATA) - ${d.label}`,
                                     shipments: matching
                                   });
                                 }}
                                 onRampUpClick={(d) => {
                                   const period = d?.period || d?.payload?.period;
                                   if (!period) return;
                                   const matching = filteredShipments.filter(s => {
                                     const date = s.ata || s.estimatedDelivery;
                                     if (!date) return false;
                                     const { week, year } = getISOWeek(date);
                                     return `W${week} - ${year}` === period;
                                   });
                                   setModalData({
                                     isOpen: true,
                                     weekLabel: `Ramp-Up Plan - ${period}`,
                                     shipments: matching
                                   });
                                 }}
                                 onBondedInventoryClick={(d, type) => {
                                   const todayUTC = toUTC(new Date());

                                   const matching = filteredShipments.filter(s => {
                                     if (s.bondedWarehouse !== d.name || !s.ata || s.deliveryByd) return false;
                                     const isFuture = toUTC(s.ata).getTime() > todayUTC.getTime();
                                     if (type === 'futureArrivals') return isFuture;
                                     if (type === 'arrivedNotPicked') return !isFuture;
                                     return true; // Fallback if no type is provided
                                   });
                                   const groupedData = matching.reduce((acc, s) => {
                                     const vessel = s.vesselName || 'Unknown Vessel';
                                     const bl = s.billOfLading || 'Unknown BL';
                                     if (!acc[vessel]) acc[vessel] = {};
                                     if (!acc[vessel][bl]) acc[vessel][bl] = [];
                                     if (s.containerNumber) acc[vessel][bl].push(s.containerNumber);
                                     return acc;
                                   }, {} as Record<string, Record<string, string[]>>);
                                   
                                   const labelSuffix = type === 'futureArrivals' ? 'Future Arrivals' : type === 'arrivedNotPicked' ? 'Arrived Already' : 'Arrived & Not Picked';
                                   
                                   setModalData({
                                     isOpen: true,
                                     weekLabel: `${labelSuffix} - ${d.name}`,
                                     shipments: matching,
                                     groupedData
                                   });
                                 }}
                               />
                            )}
                         </div>
                        <section id="lot-grid" className="export-section">
                           <OperationalLotGrid shipments={filteredShipments} onLotClick={handleLotClick} />
                        </section>
                        <section id="lot-breakdown" className="export-section">
                           <DailyLotBreakdown shipments={filteredShipments} />
                        </section>
                    </div>
                    <div className="space-y-8">
                      <section id="ai-summary" className="export-section bg-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-icons text-7xl">tour</span>
                         </div>
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Supervisor Executive Summary</h5>
                         <p className="text-sm font-medium leading-relaxed italic">
                            “During the selected period, the operation achieved the daily goal on <span className="text-emerald-400 font-bold">{kpis.daysGoalAchieved}</span> out of <span className="text-slate-300 font-bold">{kpis.totalWeekdaysOperated}</span> weekdays, reaching <span className={`${goalTextColor} font-bold`}>{kpis.goalAchievementPct}%</span> of the target. 
                            Weekend operations added <span className="text-emerald-400 font-bold">{kpis.weekendBonusVolume}</span> bonus containers, improving overall throughput.”
                         </p>
                      </section>
                      <section id="supplier-analysis" className="export-section">
                         <SupplierAnalysis shipments={filteredShipments} />
                      </section>
                      <section id="scenario-audit" className="export-section">
                         <ScenarioChart shipments={filteredShipments} />
                      </section>
                    </div>
                 </div>

                 <div className="no-export">
                   <ShipmentTable 
                      shipments={paginatedShipments} sortConfig={sortConfig} onSort={setSortConfig} searchTerm={searchTerm} onSearch={setSearchTerm}
                      currentPage={currentPage} totalItems={sortedShipments.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage}
                   />
                 </div>
               </>
             )}
          </div>
        ) : mainView === "goods_analysis" ? (
          <GoodsAnalysis data={charts} shipments={filteredShipments} />
        ) : mainView === "tco_analysis" ? (
          <TcoAnalysis data={charts} shipments={filteredShipments} />
        ) : mainView === "kraljic_matrix" ? (
          <KraljicMatrix data={charts} shipments={filteredShipments} />
        ) : mainView === "benchmark" ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-2 flex flex-col justify-between gap-6 md:flex-row md:items-center print:mb-4 no-export">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Benchmark & Estimation</h2>
                <p className="text-slate-500 text-sm">Simulate costs for future projects using historical INCT benchmarks and quantity controls.</p>
              </div>

              <div className="flex items-center gap-4 print:hidden">
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 p-2 shadow-sm">
                  <label className="text-[10px] font-bold uppercase text-slate-400 px-2">Global Qty Est.</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => benchmark.handleQuantityChange(containerQuantity - 1)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600">
                      <span className="material-icons text-sm">remove</span>
                    </button>
                    <input type="number" value={containerQuantity} onChange={(e) => benchmark.handleQuantityChange(parseInt(e.target.value) || 1)} className="w-14 text-center font-black text-red-600 focus:outline-none" />
                    <button onClick={() => benchmark.handleQuantityChange(containerQuantity + 1)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md">
                      <span className="material-icons text-sm">add</span>
                    </button>
                  </div>
                </div>
                <button onClick={benchmark.resetToInitial} className="h-12 px-6 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition-all shadow-sm">Reset Estimates</button>
              </div>
            </header>

            <nav className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit print:hidden no-export">
              {[
                { id: "freight", label: "General Freight", icon: "local_shipping" },
                { id: "return", label: "Return Empty Cntr", icon: "keyboard_return" },
                { id: "warehouse", label: "Bonded Warehouse", icon: "warehouse" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => benchmark.setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all ${
                    activeTab === tab.id ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span className="material-icons text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            <InctConfigPanel inct={inct} onInctChange={benchmark.handleINCTChange} />

            {activeTab === "warehouse" && (
              <WarehouseScenarioSummary routes={benchmark.activeRoutes} carriers={benchmark.activeCarriers} quantity={containerQuantity} />
            )}

            <RoutesTable 
              routes={benchmark.activeRoutes} carriers={benchmark.activeCarriers} routeMetrics={benchmark.routeMetrics} inct={inct}
              onPriceChange={benchmark.handlePriceChange} showDistance={activeTab !== "warehouse"} 
            />

            <CarrierCards 
              carriers={benchmark.activeCarriers} carrierSummary={benchmark.carrierSummary} routeMetrics={benchmark.routeMetrics}
              routes={benchmark.activeRoutes} inct={inct} justifications={justifications as any} onJustificationChange={benchmark.handleJustificationChange}
            />
          </div>
        ) : mainView === "estimative" ? (
          <TransportEstimative 
            routes={benchmark.state.routes}
            routeMetrics={benchmark.allFreightMetrics}
            warehouseRoutes={benchmark.state.warehouseRoutes}
            provision={provision}
            historicalShipments={filteredShipments} 
            onUpdate={benchmark.handleProvisionUpdate}
            onRouteQtyUpdate={benchmark.handleRouteProvisionQty}
          />
        ) : (
          <WarehouseSimulation historicalShipments={filteredShipments} />
        )}
      </main>

      <ChartDetailsModal 
        isOpen={modalData.isOpen} 
        weekLabel={modalData.weekLabel} 
        shipments={modalData.shipments} 
        groupedData={modalData.groupedData}
        avgDrainRate={parseFloat(kpis.avgWeekdayVolume) || 1}
        onClose={() => setModalData(d => ({...d, isOpen: false}))} 
      />
    </div>
  );
}
