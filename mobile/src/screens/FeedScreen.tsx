import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Incident, ReportResponse, Severity } from '../types';
import { SeverityColors, LifecycleColors, LightTheme, DarkTheme, AppTheme } from '../constants/colors';
import { RootTabParamList } from '../navigation/AppNavigator';
import { useIncidents } from '../context/IncidentsContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../constants/api';

type Nav = BottomTabNavigationProp<RootTabParamList>;

type FeedItem =
  | { kind: 'incident'; data: Incident; date: Date }
  | { kind: 'report'; data: ReportResponse; date: Date };

const SEVERITY_FILTERS: Array<Severity | null> = [null, 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
const FILTER_LABELS: Record<string, string> = {
  null: 'All', CRITICAL: 'Critical', HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low',
};

type DisasterType = 'EARTHQUAKE' | 'FLOOD' | 'LANDSLIDE' | 'FOREST_FIRE' | 'FIRE' | 'HEATWAVE';
const DISASTER_FILTERS: Array<DisasterType | null> = [null, 'EARTHQUAKE', 'FLOOD', 'LANDSLIDE', 'FOREST_FIRE', 'FIRE', 'HEATWAVE'];
const DISASTER_LABELS: Record<string, string> = {
  null: 'All Types', EARTHQUAKE: 'Earthquake', FLOOD: 'Flood',
  LANDSLIDE: 'Landslide', FOREST_FIRE: 'Forest Fire', FIRE: 'Fire', HEATWAVE: 'Heatwave',
};

function getDisasterType(text: string): DisasterType | null {
  const t = text.toLowerCase();
  if (t.includes('earthquake') || t.includes('tremor') || t.includes('quake')) return 'EARTHQUAKE';
  if (t.includes('flood') || t.includes('flooding')) return 'FLOOD';
  if (t.includes('landslide') || t.includes('land slide')) return 'LANDSLIDE';
  if (t.includes('forest fire') || t.includes('wildfire')) return 'FOREST_FIRE';
  if (t.includes('fire')) return 'FIRE';
  if (t.includes('heat') || t.includes('heatwave')) return 'HEATWAVE';
  return null;
}

function detectDisasterType(description: string): string {
  const type = getDisasterType(description);
  if (type === 'EARTHQUAKE') return 'Earthquake Report';
  if (type === 'FLOOD') return 'Flood Report';
  if (type === 'LANDSLIDE') return 'Landslide Report';
  if (type === 'FOREST_FIRE') return 'Forest Fire Report';
  if (type === 'FIRE') return 'Fire Report';
  if (type === 'HEATWAVE') return 'Heatwave Report';
  return 'Citizen Report';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: t.bg },
    header:      { backgroundColor: t.bg },
    heading:     { fontSize: 24, fontWeight: '700', color: t.text, padding: 16, paddingBottom: 10 },
    pillsScroll: { height: 44 },
    filters:     { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
    list:        { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    pill: {
      paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1.5, borderColor: t.pillBorder, backgroundColor: t.card,
    },
    pillText:       { fontSize: 13, fontWeight: '600', color: t.sectionTitle },
    pillTextActive: { color: t.activePillText },
    sortRow: {
      paddingHorizontal: 16, paddingBottom: 10, alignItems: 'flex-end',
    },
    sortBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
      borderWidth: 1.5, borderColor: t.pillBorder, backgroundColor: t.card,
    },
    sortBtnText: { fontSize: 12, fontWeight: '600', color: t.sectionTitle },

    card: {
      flexDirection: 'row', backgroundColor: t.card, borderRadius: 14,
      marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 }, elevation: 3, overflow: 'hidden',
    },
    accentBar:      { width: 4 },
    cardInner:      { flex: 1, padding: 16 },
    cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    severityBadge:  { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    severityText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
    lifecycleBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    lifecycleText:  { fontSize: 11, fontWeight: '600' },
    timeAgo:        { marginLeft: 'auto', fontSize: 12, color: t.muted },
    title:          { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 4 },
    description:    { fontSize: 13, color: t.subtext, lineHeight: 18, marginBottom: 10 },

    cardFooter:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    locationBlock: { flex: 1 },
    locationRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
    locationText:  { fontSize: 13, color: t.sectionTitle, fontWeight: '600' },
    coords:        { fontSize: 11, color: t.muted, marginLeft: 17 },
    mapBtn:        { padding: 4, marginTop: 1 },

    expandDivider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginTop: 12, marginBottom: 10 },
    expandRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    expandLabel:   { fontSize: 11, fontWeight: '700', color: t.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
    expandValue:   { fontSize: 12, color: t.subtext, flex: 1, textAlign: 'right', paddingLeft: 12 },

    emptyState:    { alignItems: 'center', paddingTop: 64, paddingBottom: 24 },
    emptyTitle:    { fontSize: 15, fontWeight: '700', color: t.sectionTitle, marginTop: 14 },
    emptySubtitle: { fontSize: 13, color: t.muted, marginTop: 4 },
  });
}

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const { incidents, loading, refreshing, refresh } = useIncidents();
  const { isDark } = useTheme();
  const t = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(t), [t]);

  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
  const [disasterFilter, setDisasterFilter] = useState<DisasterType | null>(null);
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [sortMode, setSortMode] = useState<'newest' | 'oldest'>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const fetchReports = useCallback(() => {
    fetch(`${API_BASE_URL}/api/v1/reports`)
      .then(r => r.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReports();
    return navigation.addListener('focus', fetchReports);
  }, [navigation, fetchReports]);

  const feedItems = useMemo<FeedItem[]>(() => {
    const incidentItems = incidents
      .filter(i => !severityFilter || i.severity === severityFilter)
      .filter(i => !disasterFilter || getDisasterType(`${i.title} ${i.description}`) === disasterFilter)
      .map(i => ({ kind: 'incident' as const, data: i, date: new Date(i.reported_at) }));

    const reportItems = reports
      .filter(r => !disasterFilter || getDisasterType(r.description) === disasterFilter)
      .map(r => ({ kind: 'report' as const, data: r, date: new Date(r.submitted_at) }));

    const items = [...incidentItems, ...reportItems];
    if (sortMode === 'oldest') return items.sort((a, b) => a.date.getTime() - b.date.getTime());
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [incidents, reports, severityFilter, disasterFilter, sortMode]);

  const viewOnMap = (item: Incident) => {
    navigation.navigate('LiveMap', {
      focusLat: item.latitude,
      focusLng: item.longitude,
      focusId: item.id,
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.heading}>Feed</Text>

        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filters} style={s.pillsScroll}
        >
          {SEVERITY_FILTERS.map(f => {
            const active = severityFilter === f;
            return (
              <TouchableOpacity
                key={String(f)}
                style={[s.pill, active && { backgroundColor: t.activePillBg, borderColor: t.activePillBg }]}
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

        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filters} style={s.pillsScroll}
        >
          {DISASTER_FILTERS.map(f => {
            const active = disasterFilter === f;
            return (
              <TouchableOpacity
                key={String(f)}
                style={[s.pill, active && { backgroundColor: t.activePillBg, borderColor: t.activePillBg }]}
                onPress={() => setDisasterFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[s.pillText, active && s.pillTextActive]}>
                  {DISASTER_LABELS[String(f)]}
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
              size={13} color={t.sectionTitle}
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
          ListEmptyComponent={<EmptyFeed s={s} />}
          renderItem={({ item }) =>
            item.kind === 'incident'
              ? <IncidentCard
                  item={item.data}
                  onViewMap={viewOnMap}
                  s={s}
                  isExpanded={expandedId === item.data.id}
                  onToggle={() => toggleExpand(item.data.id)}
                />
              : <ReportCard
                  item={item.data}
                  s={s}
                  isExpanded={expandedId === item.data.id}
                  onToggle={() => toggleExpand(item.data.id)}
                />
          }
        />
      )}
    </SafeAreaView>
  );
}

type S = ReturnType<typeof makeStyles>;

function EmptyFeed({ s }: { s: S }) {
  return (
    <View style={s.emptyState}>
      <Ionicons name="search-outline" size={42} color="#D1D5DB" />
      <Text style={s.emptyTitle}>No incidents found</Text>
      <Text style={s.emptySubtitle}>Try a different filter</Text>
    </View>
  );
}

function IncidentCard({ item, onViewMap, s, isExpanded, onToggle }: {
  item: Incident;
  onViewMap: (i: Incident) => void;
  s: S;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} onPress={onToggle} activeOpacity={0.85}>
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
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
        </View>

        <Text style={s.title}>{item.title}</Text>
        <Text style={s.description} numberOfLines={isExpanded ? undefined : 2}>
          {item.description}
        </Text>

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

        {isExpanded && (
          <>
            <View style={s.expandDivider} />
            {!!item.zone.name && (
              <View style={s.expandRow}>
                <Text style={s.expandLabel}>Disaster Type</Text>
                <Text style={s.expandValue}>{item.zone.name}</Text>
              </View>
            )}
            <View style={s.expandRow}>
              <Text style={s.expandLabel}>Reported</Text>
              <Text style={s.expandValue}>{fullDate(item.reported_at)}</Text>
            </View>
            <View style={s.expandRow}>
              <Text style={s.expandLabel}>Last updated</Text>
              <Text style={s.expandValue}>{fullDate(item.updated_at)}</Text>
            </View>
            <View style={s.expandRow}>
              <Text style={s.expandLabel}>Coordinates</Text>
              <Text style={s.expandValue}>
                {item.latitude.toFixed(6)}°N, {item.longitude.toFixed(6)}°E
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ReportCard({ item, s, isExpanded, onToggle }: {
  item: ReportResponse;
  s: S;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} onPress={onToggle} activeOpacity={0.85}>
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
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
        </View>

        <Text style={s.title}>{detectDisasterType(item.description)}</Text>
        <Text style={s.description} numberOfLines={isExpanded ? undefined : 2}>
          {item.description}
        </Text>

        <View style={s.locationRow}>
          <Ionicons name="location-sharp" size={13} color="#7C3AED" />
          <Text style={s.locationText}>
            {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
          </Text>
        </View>

        {isExpanded && (
          <>
            <View style={s.expandDivider} />
            <View style={s.expandRow}>
              <Text style={s.expandLabel}>Submitted</Text>
              <Text style={s.expandValue}>{fullDate(item.submitted_at)}</Text>
            </View>
            <View style={s.expandRow}>
              <Text style={s.expandLabel}>Coordinates</Text>
              <Text style={s.expandValue}>
                {item.latitude.toFixed(6)}°N, {item.longitude.toFixed(6)}°E
              </Text>
            </View>
            {!!item.image_url && (
              <View style={s.expandRow}>
                <Text style={s.expandLabel}>Photo</Text>
                <Text style={s.expandValue}>Attached</Text>
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}
