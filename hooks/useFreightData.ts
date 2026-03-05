
import { useEffect, useMemo, useState } from "react";
import { DashboardState, CarrierId, RouteMetric, CarrierSummary, TabId, RoutePrice, ProvisionSettings } from "../types";
import { INITIAL_STATE, LOCAL_STORAGE_KEY, FREIGHT_CARRIERS, WAREHOUSE_CARRIERS } from "../constants";

export function useFreightData() {
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          ...INITIAL_STATE,
          ...parsed,
          routes: parsed.routes || INITIAL_STATE.routes,
          returnRoutes: parsed.returnRoutes || INITIAL_STATE.returnRoutes,
          warehouseRoutes: parsed.warehouseRoutes || INITIAL_STATE.warehouseRoutes,
          justifications: parsed.justifications || {},
          provision: parsed.provision || INITIAL_STATE.provision,
        });
      }
    } catch (e) {
      console.warn("Error loading from localStorage", e);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeCarriers = useMemo(() => {
    return state.activeTab === "warehouse" ? WAREHOUSE_CARRIERS : FREIGHT_CARRIERS;
  }, [state.activeTab]);

  const activeRoutes = useMemo(() => {
    if (state.activeTab === "freight") return state.routes;
    if (state.activeTab === "return") return state.returnRoutes;
    return state.warehouseRoutes;
  }, [state.activeTab, state.routes, state.returnRoutes, state.warehouseRoutes]);

  const calculateRouteMetrics = (routes: RoutePrice[], carriers: any[]) => {
    return routes.map((route) => {
      const values = Object.values(route.prices).filter(
        (v): v is number => v != null && !isNaN(v as number)
      );
      const minPrice = values.length > 0 ? Math.min(...values) : null;

      const diffPctByCarrier: Partial<Record<CarrierId, number | null>> = {};
      carriers.forEach((c) => {
        const price = route.prices[c.id];
        if (price != null && minPrice != null) {
          diffPctByCarrier[c.id] = minPrice === 0 ? 0 : ((price - minPrice) / minPrice) * 100;
        } else {
          diffPctByCarrier[c.id] = null;
        }
      });

      return { routeId: route.id, minPrice, diffPctByCarrier };
    });
  };

  const routeMetrics = useMemo(() => {
    return calculateRouteMetrics(activeRoutes, activeCarriers);
  }, [activeRoutes, activeCarriers]);

  // Specific metrics for ALL routes (needed for provision)
  const allFreightMetrics = useMemo(() => {
    return calculateRouteMetrics(state.routes, FREIGHT_CARRIERS);
  }, [state.routes]);

  const warehouseMetrics = useMemo(() => {
    return calculateRouteMetrics(state.warehouseRoutes, WAREHOUSE_CARRIERS);
  }, [state.warehouseRoutes]);

  const carrierSummary = useMemo(() => {
    const result: Record<string, CarrierSummary> = {};

    activeCarriers.forEach((c) => {
      result[c.id] = { avgDiffPct: null, count: 0, estimatedTotal: 0, totalBasePrice: 0 };
    });

    routeMetrics.forEach((rm) => {
      const route = activeRoutes.find((r) => r.id === rm.routeId);
      activeCarriers.forEach((c) => {
        const diff = rm.diffPctByCarrier[c.id];
        const price = route?.prices[c.id];
        
        if (diff != null) {
          const entry = result[c.id];
          entry.avgDiffPct = (entry.avgDiffPct ?? 0) + diff;
          entry.count += 1;
        }

        if (price != null) {
          const entry = result[c.id];
          entry.totalBasePrice += price;
        }
      });
    });

    Object.keys(result).forEach((id) => {
      const entry = result[id];
      if (entry.count > 0 && entry.avgDiffPct != null) {
        entry.avgDiffPct = entry.avgDiffPct / entry.count;
      }
      entry.estimatedTotal = entry.totalBasePrice * state.containerQuantity;
    });

    return result as Record<CarrierId, CarrierSummary>;
  }, [routeMetrics, activeCarriers, activeRoutes, state.containerQuantity]);

  const handlePriceChange = (routeId: string, carrierId: CarrierId, value: string) => {
    const numeric = value === "" ? null : Number(value.replace(",", "."));
    const update = (routes: RoutePrice[]) =>
      routes.map((r) =>
        r.id === routeId
          ? { ...r, prices: { ...r.prices, [carrierId]: isNaN(numeric as number) ? null : numeric } }
          : r
      );

    setState((prev) => ({
      ...prev,
      routes: prev.activeTab === "freight" ? update(prev.routes) : prev.routes,
      returnRoutes: prev.activeTab === "return" ? update(prev.returnRoutes) : prev.returnRoutes,
      warehouseRoutes: prev.activeTab === "warehouse" ? update(prev.warehouseRoutes) : prev.warehouseRoutes,
    }));
  };

  const handleQuantityChange = (qty: number) => {
    setState(prev => ({ ...prev, containerQuantity: Math.max(1, qty) }));
  };

  const handleProvisionUpdate = (updates: Partial<ProvisionSettings>) => {
    setState(prev => ({
      ...prev,
      provision: { ...prev.provision, ...updates }
    }));
  };

  const handleRouteProvisionQty = (routeId: string, qty: number) => {
    setState(prev => ({
      ...prev,
      provision: {
        ...prev.provision,
        transportQty: { ...prev.provision.transportQty, [routeId]: qty }
      }
    }));
  };

  const setActiveTab = (tab: TabId) => setState((prev) => ({ ...prev, activeTab: tab }));
  
  const handleINCTChange = (field: string, value: string) => {
    const numeric = Number(value.replace(",", "."));
    setState((prev) => ({ ...prev, inct: { ...prev.inct, [field as any]: numeric } }));
  };

  const handleJustificationChange = (id: CarrierId, val: string) =>
    setState((prev) => ({ ...prev, justifications: { ...prev.justifications, [id]: val } }));

  const resetToInitial = () => setState(INITIAL_STATE);

  return {
    state,
    activeCarriers,
    activeRoutes,
    routeMetrics,
    allFreightMetrics,
    warehouseMetrics,
    carrierSummary,
    handlePriceChange,
    handleQuantityChange,
    handleINCTChange,
    handleJustificationChange,
    handleProvisionUpdate,
    handleRouteProvisionQty,
    setActiveTab,
    resetToInitial,
  };
}