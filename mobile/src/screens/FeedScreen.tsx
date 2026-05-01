import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Incident, ReportResponse, Severity } from '../types';
import { SeverityColors, LifecycleColors } from '../constants/colors';
import { RootTabParamList } from '../navigation/AppNavigator';
import { useIncidents } from '../context/IncidentsContext';
import { API_BASE_URL } from '../constants/api';

type Nav = BottomTabNavigationProp<RootTabParamList>;

type FeedItem =
  | { kind: 'incident'; data: Incident; date: Date }
  | { kind: 'report'; data: ReportResponse; date: Date };

const SEVERITY_FILTERS: Array<Severity | null> = [null, 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
const FILTER_LABELS: Record<string, string> = {
  null: 'All', CRITICAL: 'Critical', HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const { incidents, loading, refreshing, refresh } = useIncidents();
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
  const [reports, setReports] = useState<ReportResponse[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/reports`)
      .then(r => r.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const feedItems = useMemo<FeedItem[]>(() => {
    const incidentItems = incidents
      .filter(i => !severityFilter || i.severity === severityFilter)
      .map(i => ({ kind: 'incident' as const, data: i, date: new Date(i.reported_at) }));

    const reportItems = reports.map(r => ({
      kind: 'report' as const,
      data: r,
      date: new Date(r.submitted_at),
    }));

    return [...incidentItems, ...reportItems].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [incidents, reports, severityFilter]);

  const viewOnMap = (item: Incident) => {
    navigation.navigate('LiveMap', {
      focusLat: item.latitude,
      focusLng: item.longitude,
      focusId: item.id,
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.heading}>Feed</Text>

      {/* Severity filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {SEVERITY_FILTERS.map(f => {
          const active = severityFilter === f;
          const color = f ? SeverityColors[f] : '#374151';
          return (
            <TouchableOpacity
              key={String(f)}
              style={[s.pill, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => setSeverityFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[s.pillText, active && s.pillTextActive]}>
                {FILTER_LABELS[String(f)]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#DC2626" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={item => item.kind + item.data.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListEmptyComponent={<Text style={s.empty}>No incidents match this filter.</Text>}
          renderItem={({ item }) =>
            item.kind === 'incident'
              ? <IncidentCard item={item.data} onViewMap={viewOnMap} />
              : <ReportCard item={item.data} />
          }
        />
      )}
    </SafeAreaView>
  );
}

function IncidentCard({ item, onViewMap }: { item: Incident; onViewMap: (i: Incident) => void }) {
  return (
    <View style={s.card}>
      <View style={[s.accentBar, { backgroundColor: SeverityColors[item.severity] }]} />
      <View style={s.cardInner}>
        <View style={s.cardHeader}>
          <View style={[s.severityBadge, { backgroundColor: SeverityColors[item.severity] }]}>
            <Text style={s.severityText}>{item.severity}</Text>
          </View>
          <View style={[s.lifecycleBadge, { borderColor: LifecycleColors[item.lifecycle] }]}>
            <Text style={[s.lifecycleText, { color: LifecycleColors[item.lifecycle] }]}>
              {item.lifecycle}
            </Text>
          </View>
          <Text style={s.timeAgo}>{timeAgo(item.reported_at)}</Text>
        </View>

        <Text style={s.title}>{item.title}</Text>
        <Text style={s.description} numberOfLines={2}>{item.description}</Text>

        <View style={s.locationRow}>
          <Ionicons name="location-sharp" size={13} color="#DC2626" />
          <Text style={s.locationText}>
            {item.zone.district}
            {item.zone.municipality ? ` · ${item.zone.municipality}` : ''}
          </Text>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.coords}>
            {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
          </Text>
          <TouchableOpacity style={s.mapBtn} onPress={() => onViewMap(item)} activeOpacity={0.7}>
            <Ionicons name="map" size={13} color="#2563EB" />
            <Text style={s.mapBtnText}>View on Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ReportCard({ item }: { item: ReportResponse }) {
  return (
    <View style={s.card}>
      <View style={[s.accentBar, { backgroundColor: '#7C3AED' }]} />
      <View style={s.cardInner}>
        <View style={s.cardHeader}>
          <View style={[s.severityBadge, { backgroundColor: '#7C3AED' }]}>
            <Text style={s.severityText}>CITIZEN</Text>
          </View>
          <View style={[s.lifecycleBadge, { borderColor: LifecycleColors[item.lifecycle] }]}>
            <Text style={[s.lifecycleText, { color: LifecycleColors[item.lifecycle] }]}>
              {item.lifecycle}
            </Text>
          </View>
          <Text style={s.timeAgo}>{timeAgo(item.submitted_at)}</Text>
        </View>

        <Text style={s.title}>Citizen Report</Text>
        <Text style={s.description} numberOfLines={2}>{item.description}</Text>

        <View style={s.locationRow}>
          <Ionicons name="location-sharp" size={13} color="#7C3AED" />
          <Text style={s.locationText}>
            {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F9FAFB' },
  heading:        { fontSize: 24, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 10 },

  filters:        { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff',
  },
  pillText:       { fontSize: 13, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },

  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  accentBar:      { width: 4 },
  cardInner:      { flex: 1, padding: 12 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityBadge:  { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  severityText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  lifecycleBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  lifecycleText:  { fontSize: 11, fontWeight: '600' },
  timeAgo:        { marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' },
  title:          { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  description:    { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText:   { fontSize: 13, color: '#374151', fontWeight: '600' },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coords:         { fontSize: 11, color: '#9CA3AF' },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
  },
  mapBtnText:     { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  empty:          { textAlign: 'center', color: '#6B7280', marginTop: 40 },
});
