import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
  const [sortMode, setSortMode] = useState<'newest' | 'oldest'>('newest');

  const fetchReports = useCallback(() => {
    fetch(`${API_BASE_URL}/api/v1/reports`)
      .then(r => r.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useFocusEffect(fetchReports);

  const feedItems = useMemo<FeedItem[]>(() => {
    const incidentItems = incidents
      .filter(i => !severityFilter || i.severity === severityFilter)
      .map(i => ({ kind: 'incident' as const, data: i, date: new Date(i.reported_at) }));

    const reportItems = reports.map(r => ({
      kind: 'report' as const,
      data: r,
      date: new Date(r.submitted_at),
    }));

    const items = [...incidentItems, ...reportItems];
    if (sortMode === 'oldest') {
      return items.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [incidents, reports, severityFilter, sortMode]);

  const viewOnMap = (item: Incident) => {
    navigation.navigate('LiveMap', {
      focusLat: item.latitude,
      focusLng: item.longitude,
      focusId: item.id,
    });
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Locked header — never reflowed by list content */}
      <View style={s.header}>
        <Text style={s.heading}>Feed</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filters}
          style={s.pillsScroll}
        >
          {SEVERITY_FILTERS.map(f => {
            const active = severityFilter === f;
            return (
              <TouchableOpacity
                key={String(f)}
                style={[s.pill, active && { backgroundColor: '#111827', borderColor: '#111827' }]}
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

        <View style={s.sortRow}>
          <TouchableOpacity
            style={s.sortBtn}
            onPress={() => setSortMode(m => m === 'newest' ? 'oldest' : 'newest')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sortMode === 'newest' ? 'arrow-down-outline' : 'arrow-up-outline'}
              size={13}
              color="#374151"
            />
            <Text style={s.sortBtnText}>
              {sortMode === 'newest' ? 'Newest first' : 'Oldest first'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#DC2626" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          style={s.list}
          data={feedItems}
          keyExtractor={item => item.kind + item.data.id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { refresh(); fetchReports(); }} />}
          ListEmptyComponent={<EmptyFeed />}
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

function EmptyFeed() {
  return (
    <View style={s.emptyState}>
      <Ionicons name="search-outline" size={42} color="#D1D5DB" />
      <Text style={s.emptyTitle}>No incidents found</Text>
      <Text style={s.emptySubtitle}>Try a different filter</Text>
    </View>
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

        <View style={s.cardFooter}>
          <View style={s.locationBlock}>
            <View style={s.locationRow}>
              <Ionicons name="location-sharp" size={13} color="#DC2626" />
              <Text style={s.locationText}>
                {item.zone.district}
                {item.zone.municipality ? ` · ${item.zone.municipality}` : ''}
              </Text>
            </View>
            <Text style={s.coords}>
              {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
            </Text>
          </View>
          <TouchableOpacity style={s.mapBtn} onPress={() => onViewMap(item)} activeOpacity={0.7}>
            <Ionicons name="map-outline" size={20} color="#2563EB" />
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
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  header:     { backgroundColor: '#F9FAFB' },
  heading:    { fontSize: 24, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 10 },
  pillsScroll: { height: 44 },
  filters:    { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  list:       { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  pill: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff',
  },
  pillText:       { fontSize: 13, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },
  sortRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff',
  },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
    overflow: 'hidden',
  },
  accentBar:      { width: 4 },
  cardInner:      { flex: 1, padding: 16 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityBadge:  { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  severityText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  lifecycleBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  lifecycleText:  { fontSize: 11, fontWeight: '600' },
  timeAgo:        { marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' },
  title:          { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  description:    { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 10 },

  cardFooter:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  locationBlock: { flex: 1 },
  locationRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  locationText:  { fontSize: 13, color: '#374151', fontWeight: '600' },
  coords:        { fontSize: 11, color: '#B0B8C4', marginLeft: 17 },
  mapBtn:        { padding: 4, marginTop: 1 },

  emptyState:    { alignItems: 'center', paddingTop: 64, paddingBottom: 24 },
  emptyTitle:    { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
