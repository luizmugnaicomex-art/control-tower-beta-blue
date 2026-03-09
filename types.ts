
export type CarrierId =
  | "TPC"
  | "INTERMARITIMA"
  | "CLIA_EMP"
  | "RECOM"
  | "CTS_MEDLOG"
  | "TRANSPARANA"
  | "TEGMA"
  | "TECON";

export interface Carrier {
  id: CarrierId;
  name: string;
}

export interface RoutePrice {
  id: string;
  description: string;
  distanceKm: number;
  prices: Partial<Record<CarrierId, number | null>>;
}

export interface INCTConfig {
  inctLotacao: number;
  inctFracionado: number;
  alertaAcimaPct: number;
}

export type TabId = "freight" | "return" | "warehouse";

export interface ProvisionSettings {
  transportQty: Record<string, number>;
  warehouseLeadTime: number;
  warehouseQty: number;
  selectedWarehouseId: CarrierId;
}

export interface DashboardState {
  routes: RoutePrice[];
  returnRoutes: RoutePrice[];
  warehouseRoutes: RoutePrice[];
  inct: INCTConfig;
  justifications: Partial<Record<CarrierId, string>>;
  activeTab: TabId;
  containerQuantity: number;
  provision: ProvisionSettings;
}

export interface RouteMetric {
  routeId: string;
  minPrice: number | null;
  diffPctByCarrier: Partial<Record<CarrierId, number | null>>;
}

export interface CarrierSummary {
  avgDiffPct: number | null;
  count: number;
  estimatedTotal: number;
  totalBasePrice: number;
}

export interface Shipment {
  containerNumber: string;
  billOfLading: string;
  lotNumber: string; 
  batchNumber: string; 
  cargoModel: string;  
  shipper: string;
  shipowner: string;
  cargo: string;
  vesselName: string;
  containerType: string;
  incoterm: string;
  bondedWarehouse: string;
  depot: string; // New field for Column AZ
  ata: Date | null;
  deliveryByd: Date | null;
  estimatedDelivery: Date | null;
  demurrageCost: number;
  parametrization: string;
  dateNF: Date | null;
  unloadDate: Date | null;
  carrier: string;
  analyst: string;
  cargoReadyDate: Date | null;
  channelDate: Date | null;
  actualDepotReturnDate: Date | null;
  estimatedDepotDate: Date | null;
  freeTimeDate: Date | null;
  totalCost: number;
  taxCost: number;
  extraCost: number;
  portToDelivery: number | null;
  clientDeliveryVariance: number | null;
  totalClearanceTime: number | null;
  ataToChannelTime: number | null;
  channelToNfTime: number | null;
  customsProcessTime: number | null;
  portToCustomsTime: number | null;
  transportDeliveryTime: number | null;
  containerStreetTurnTime: number | null;
  depotReturnVariance: number | null;
  detentionRisk: number | null;
  portToCargoReady: number | null;
  madeRomaneio: string;
  status: string;
}

export interface PipelineWeek {
    period: string; 
    vessels: string[];
    volume: number;
    deliveredCount: number;
    pendingCount: number;
    drainDaysGate: number;
    drainDaysFactory: number;
    status: 'PRAZO VENCIDO' | 'SAFE' | 'TIME COLLISION' | 'COMPLETED';
    weekNum: number;
    year: number;
}

export interface KpiData {
  totalShipments: number;
  deliveredCount: number;
  onTimePercentage: string;
  totalDemurrage: number;
  demurrageShipmentsCount: number;
  detentionRiskShipments: number;
  avgPortToDelivery: string;
  avgClearanceTime: string;
  avgAtaToChannel: string;
  avgChannelToNf: string;
  avgTransportTime: string;
  avgStreetTurnTime: string;
  avgPortToCargoReady: string;
  avgClientDeliveryVariance: string;
  avgDelayOnLate: string;
  avgDetentionDays: string;
  demurrageIncidence: string;
  detentionIncidence: string;
  dailyGoalValue: number;
  daysGoalAchieved: number;
  daysGoalNotAchieved: number;
  goalAchievementPct: string;
  avgWeekdayVolume: string;
  totalWeekdayVolume: number;
  weekendBonusVolume: number;
  totalWeekdaysOperated: number;
  totalOperationalDays: number;
  pendingRomaneioCount: number;
  flaggedContainersCount: number;
  projectedBacklogCrossing10Days: number;
  financialExposure: number;
  
  // New metrics from vanilla JS
  inTransit: number;
  portFiscal: number;
  bondedStock: number;
  ftRisk7d: number;
  ftRisk3d: number;
  bondedDwellSum: number;
  bondedDwellCount: number;
  bondedDwellGt7: number;
  bondedDwellGt10: number;
  bondedDwellMax: number;
}

export interface ChartData {
  pipeline: PipelineWeek[];
  leadTimeTrend: Array<{ 
    date: Date; 
    label: string; 
    containerCount: number; 
    lateCount: number; 
    isWeekend: boolean; 
    goalReached: boolean;
    achievementPct: number;
  }>;
  dailyCarrierBreakdown: Array<{
    date: Date;
    label: string;
    total: number;
    [key: string]: any;
  }>;
  dailyCarrierDelayBreakdown: Array<{
    date: Date;
    label: string;
    totalLate: number;
    [key: string]: any;
  }>;
  dailyDepotReturnBreakdown: Array<{
    date: Date;
    label: string;
    total: number;
    [key: string]: any;
  }>;
  monthlyStatus: Array<{
    name: string;
    delivered: number;
    pending: number;
    total: number;
    sortKey: number;
  }>;
  monthlyTrend: Array<{ name: string; value: number; late: number; sortKey: number; date: Date }>;
  dailyVolumeStats: { avg: number; min: number; max: number } | null;
  cycleTime: Array<{ name: string; value: number }>;
  carrierPerformance: Array<{ name: string; avgTime: number }>;
  carrierDelayImpact: Array<{ name: string; volume: number; lateCount: number; latePct: number; volumePct: number }>;
  depotDistribution: Array<{ name: string; value: number }>; 
  customsChannel: Array<{ name: string; value: number }>;
  demurrageIncidence: Array<{ name: string; value: number }>;
  detentionRisk: Array<{ name: string; value: number }>;
  analystWorkload: Array<{ name: string; value: number }>;
  demurrageByShipowner: Array<{ name: string; cost: number }>;
  streetTurnByCarrier: Array<{ name: string; avgTime: number }>;
  portToCargoReadyByCarrier: Array<{ name: string; avgTime: number }>;
  deliveryVarianceByCarrier: Array<{ name: string; avgVariance: number }>;
  carrierVolume: Array<{ name: string; value: number }>;
  warehouseVolume: Array<{ name: string; value: number; capacity: number }>;
  unloadedByWarehouse: Array<{ name: string; value: number; capacity: number }>;
  bondedFlow: Array<{ name: string; placed: number; picked: number }>; // New Chart
  romaneioDistribution: Array<{ name: string; value: number }>;
  cargoReadyComparison: Array<{
    date: Date;
    label: string;
    readyCount: number;
    deliveredCount: number;
    runningBalance: number;
    isWeekend: boolean;
  }>;
}

export interface SortConfig {
  key: keyof Shipment;
  direction: "asc" | "desc";
}

export interface WarehouseContract {
  id: CarrierId;
  name: string;
  periodDays: number;
  minRates: number[]; 
  storagePct: number[]; 
  grisPct: number;
  removalFee: number;
  adValoremPct: number;
  handlingFee: number;
  presenceFee: number;
  scanningFee: number;
  insurancePct: number;
}
