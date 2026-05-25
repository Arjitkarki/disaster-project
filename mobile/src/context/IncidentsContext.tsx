import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Incident } from '../types';
import { API_BASE_URL } from '../constants/api';

interface IncidentsContextValue {
  incidents: Incident[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

const IncidentsContext = createContext<IncidentsContextValue>({
  incidents: [],
  loading: true,
  refreshing: false,
  refresh: () => {},
});

export function IncidentsProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIncidents = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    fetch(`${API_BASE_URL}/api/v1/incidents`)
      .then(r => r.json())
      .then(data => setIncidents(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(() => fetchIncidents(), 60_000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const refresh = useCallback(() => fetchIncidents(true), [fetchIncidents]);

  return (
    <IncidentsContext.Provider value={{ incidents, loading, refreshing, refresh }}>
      {children}
    </IncidentsContext.Provider>
  );
}

export const useIncidents = () => useContext(IncidentsContext);
