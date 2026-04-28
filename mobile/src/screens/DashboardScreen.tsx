import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Incident, Severity } from '../types';
import { API_BASE_URL } from '../constants/api';
import { SeverityColors, LifecycleColors } from '../constants/colors';

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

export default function DashboardScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    fetch(`${API_BASE_URL}/api/v1/incidents`)
      .then(r => r.json())
      .then(data => setIncidents(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.heading}>Dashboard</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#DC2626" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          <View style={s.statsRow}>
            {SEVERITIES.map(severity => (
              <View
                key={severity}
                style={[s.statCard, { borderTopColor: SeverityColors[severity] }]}
              >
                <Text style={[s.statCount, { color: SeverityColors[severity] }]}>
                  {incidents.filter(i => i.severity === severity).length}
                </Text>
                <Text style={s.statLabel}>{severity}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Recent Incidents</Text>
          {incidents.slice(0, 10).map(incident => (
            <View key={incident.id} style={s.row}>
              <View
                style={[s.severityDot, { backgroundColor: SeverityColors[incident.severity] }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{incident.title}</Text>
                <Text style={s.rowMeta}>
                  {incident.zone.district}
                  {'  '}
                  <Text style={{ color: LifecycleColors[incident.lifecycle] }}>
                    {incident.lifecycle}
                  </Text>
                </Text>
              </View>
            </View>
          ))}
          {incidents.length === 0 && (
            <Text style={s.empty}>No incidents to display.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  heading:     { fontSize: 24, fontWeight: '700', color: '#111827', padding: 16 },
  statsRow:    { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12,
    borderTopWidth: 3, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statCount:   { fontSize: 28, fontWeight: '800' },
  statLabel:   { fontSize: 10, fontWeight: '600', color: '#6B7280', marginTop: 2 },
  sectionTitle:{ fontSize: 16, fontWeight: '700', color: '#374151', paddingHorizontal: 16, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  severityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  rowTitle:    { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowMeta:     { fontSize: 12, color: '#6B7280', marginTop: 2 },
  empty:       { textAlign: 'center', color: '#6B7280', marginTop: 40 },
});
