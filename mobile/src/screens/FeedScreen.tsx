import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, FlatList, StyleSheet, ActivityIndicator,
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
import { useLanguage } from '../context/LanguageContext';
import { Translations } from '../constants/translations';
import { AppText } from '../components/AppText';
import { API_BASE_URL } from '../constants/api';

type Nav = BottomTabNavigationProp<RootTabParamList>;

type FeedItem =
  | { kind: 'incident'; data: Incident; date: Date }
  | { kind: 'report'; data: ReportResponse; date: Date };

type SeverityOrSource = Severity | 'CITIZEN' | null;
const SEVERITY_FILTERS: Array<SeverityOrSource> = [null, 'CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'CITIZEN'];

type DisasterType = 'EARTHQUAKE' | 'FLOOD' | 'LANDSLIDE' | 'FOREST_FIRE' | 'FIRE' | 'HEATWAVE' | 'ROAD_CLOSED' | 'HEAVY_RAINFALL';
const DISASTER_FILTERS: Array<DisasterType | null> = [null, 'EARTHQUAKE', 'FLOOD', 'LANDSLIDE', 'FOREST_FIRE', 'FIRE', 'HEATWAVE', 'ROAD_CLOSED', 'HEAVY_RAINFALL'];

function getDisasterType(text: string): DisasterType | null {
  const lower = text.toLowerCase();
  if (lower.includes('earthquake') || lower.includes('tremor') || lower.includes('quake')) return 'EARTHQUAKE';
  if (lower.includes('flood') || lower.includes('flooding')) return 'FLOOD';
  if (lower.includes('landslide') || lower.includes('land slide')) return 'LANDSLIDE';
  if (lower.includes('forest fire') || lower.includes('wildfire')) return 'FOREST_FIRE';
  if (lower.includes('road') && (lower.includes('closed') || lower.includes('block'))) return 'ROAD_CLOSED';
  if (lower.includes('heavy rain') || lower.includes('rainfall')) return 'HEAVY_RAINFALL';
  if (lower.includes('fire')) return 'FIRE';
  if (lower.includes('heat') || lower.includes('heatwave')) return 'HEATWAVE';
  return null;
}

function getReportTitle(description: string, t: Translations): string {
  const type = getDisasterType(description);
  const suffix = t.feed.reportSuffix;
  if (type === 'EARTHQUAKE') return `${t.common.earthquake} ${suffix}`;
  if (type === 'FLOOD')      return `${t.common.flood} ${suffix}`;
  if (type === 'LANDSLIDE')  return `${t.common.landslide} ${suffix}`;
  if (type === 'FOREST_FIRE')return `${t.common.forestFire} ${suffix}`;
  if (type === 'ROAD_CLOSED')return `${t.common.roadClosed} ${suffix}`;
  if (type === 'HEAVY_RAINFALL') return `${t.common.heavyRain} ${suffix}`;
  if (type === 'FIRE')       return `${t.common.fire} ${suffix}`;
  if (type === 'HEATWAVE')   return `${t.common.heatwave} ${suffix}`;
  return t.feed.citizenReport;
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
    sortRow: { paddingHorizontal: 16, paddingBottom: 10, alignItems: 'flex-end' },
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
  const { lang, t } = useLanguage();
  const theme = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [severityFilter, setSeverityFilter] = useState<SeverityOrSource>(null);
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
    const filteredReports = reports
      .filter(r => !disasterFilter || getDisasterType(r.description) === disasterFilter)
      .map(r => ({ kind: 'report' as const, data: r, date: new Date(r.submitted_at) }));

    if (severityFilter === 'CITIZEN') {
      if (sortMode === 'oldest') return filteredReports.sort((a, b) => a.date.getTime() - b.date.getTime());
      return filteredReports.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    const incidentItems = incidents
      .filter(i => !severityFilter || i.severity === severityFilter)
      .filter(i => !disasterFilter || getDisasterType(`${i.title} ${i.description}`) === disasterFilter)
      .map(i => ({ kind: 'incident' as const, data: i, date: new Date(i.reported_at) }));

    const items = [...incidentItems, ...filteredReports];
    if (sortMode === 'oldest') return items.sort((a, b) => a.date.getTime() - b.date.getTime());
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [incidents, reports, severityFilter, disasterFilter, sortMode]);

  const viewOnMap = (item: Incident) => {
    navigation.navigate('LiveMap', { focusLat: item.latitude, focusLng: item.longitude, focusId: item.id });
  };
  const viewReportOnMap = (item: ReportResponse) => {
    navigation.navigate('LiveMap', { focusLat: item.latitude, focusLng: item.longitude, focusId: '' });
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <AppText style={s.heading}>{t.feed.heading}</AppText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} style={s.pillsScroll}>
          {SEVERITY_FILTERS.map(f => {
            const active = severityFilter === f;
            return (
              <TouchableOpacity
                key={String(f)}
                style={[s.pill, active && { backgroundColor: theme.activePillBg, borderColor: theme.activePillBg }]}
                onPress={() => setSeverityFilter(f)}
                activeOpacity={0.7}
              >
                <AppText style={[s.pillText, active && s.pillTextActive]}>
                  {f === null ? t.common.all : f === 'CITIZEN' ? t.feed.citizen : f === 'CRITICAL' ? t.common.critical : f === 'HIGH' ? t.common.high : f === 'MODERATE' ? t.common.moderate : t.common.low}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} style={s.pillsScroll}>
          {DISASTER_FILTERS.map(f => {
            const active = disasterFilter === f;
            return (
              <TouchableOpacity
                key={String(f)}
                style={[s.pill, active && { backgroundColor: theme.activePillBg, borderColor: theme.activePillBg }]}
                onPress={() => setDisasterFilter(f)}
                activeOpacity={0.7}
              >
                <AppText style={[s.pillText, active && s.pillTextActive]}>
                  {f === null ? t.feed.allTypes : f === 'EARTHQUAKE' ? t.common.earthquake : f === 'FLOOD' ? t.common.flood : f === 'LANDSLIDE' ? t.common.landslide : f === 'FOREST_FIRE' ? t.common.forestFire : f === 'FIRE' ? t.common.fire : f === 'HEATWAVE' ? t.common.heatwave : f === 'ROAD_CLOSED' ? t.common.roadClosed : t.common.heavyRain}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.sortRow}>
          <TouchableOpacity style={s.sortBtn} onPress={() => setSortMode(m => m === 'newest' ? 'oldest' : 'newest')} activeOpacity={0.7}>
            <Ionicons name={sortMode === 'newest' ? 'arrow-down-outline' : 'arrow-up-outline'} size={13} color={theme.sectionTitle} />
            <AppText style={s.sortBtnText}>
              {sortMode === 'newest' ? t.feed.newestFirst : t.feed.oldestFirst}
            </AppText>
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
              ? <IncidentCard item={item.data} onViewMap={viewOnMap} s={s} lang={lang} isExpanded={expandedId === item.data.id} onToggle={() => toggleExpand(item.data.id)} />
              : <ReportCard item={item.data} onViewMap={viewReportOnMap} s={s} t={t} isExpanded={expandedId === item.data.id} onToggle={() => toggleExpand(item.data.id)} />
          }
        />
      )}
    </SafeAreaView>
  );
}

type S = ReturnType<typeof makeStyles>;

function EmptyFeed({ s }: { s: S }) {
  const { t } = useLanguage();
  return (
    <View style={s.emptyState}>
      <Ionicons name="search-outline" size={42} color="#D1D5DB" />
      <AppText style={s.emptyTitle}>{t.feed.noIncidents}</AppText>
      <AppText style={s.emptySubtitle}>{t.feed.tryFilter}</AppText>
    </View>
  );
}

function IncidentCard({ item, onViewMap, s, isExpanded, onToggle, lang }: {
  item: Incident; onViewMap: (i: Incident) => void; s: S;
  isExpanded: boolean; onToggle: () => void; lang: string;
}) {
  const { t } = useLanguage();
  return (
    <TouchableOpacity style={s.card} onPress={onToggle} activeOpacity={0.85}>
      <View style={[s.accentBar, { backgroundColor: SeverityColors[item.severity] }]} />
      <View style={s.cardInner}>
        <View style={s.cardHeader}>
          <View style={[s.severityBadge, { backgroundColor: SeverityColors[item.severity] }]}>
            <AppText style={s.severityText}>{item.severity}</AppText>
          </View>
          <View style={[s.lifecycleBadge, { borderColor: LifecycleColors[item.lifecycle] }]}>
            <AppText style={[s.lifecycleText, { color: LifecycleColors[item.lifecycle] }]}>
              {item.lifecycle}
            </AppText>
          </View>
          <AppText style={s.timeAgo}>{timeAgo(item.reported_at)}</AppText>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
        </View>

        <AppText style={s.title}>{lang === 'ne' && item.title_ne ? item.title_ne : item.title}</AppText>
        <AppText style={s.description} numberOfLines={isExpanded ? undefined : 2}>
          {item.description}
        </AppText>

        <View style={s.cardFooter}>
          <View style={s.locationBlock}>
            <View style={s.locationRow}>
              <Ionicons name="location-sharp" size={13} color="#DC2626" />
              <AppText style={s.locationText}>
                {item.zone.district}{item.zone.municipality ? ` · ${item.zone.municipality}` : ''}
              </AppText>
            </View>
            <AppText style={s.coords}>{item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E</AppText>
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
                <AppText style={s.expandLabel}>{t.feed.disasterType}</AppText>
                <AppText style={s.expandValue}>{item.zone.name}</AppText>
              </View>
            )}
            <View style={s.expandRow}>
              <AppText style={s.expandLabel}>{t.feed.reported}</AppText>
              <AppText style={s.expandValue}>{fullDate(item.reported_at)}</AppText>
            </View>
            <View style={s.expandRow}>
              <AppText style={s.expandLabel}>{t.feed.lastUpdated}</AppText>
              <AppText style={s.expandValue}>{fullDate(item.updated_at)}</AppText>
            </View>
            <View style={s.expandRow}>
              <AppText style={s.expandLabel}>{t.feed.coordinates}</AppText>
              <AppText style={s.expandValue}>{item.latitude.toFixed(6)}°N, {item.longitude.toFixed(6)}°E</AppText>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ReportCard({ item, onViewMap, s, t, isExpanded, onToggle }: {
  item: ReportResponse; onViewMap: (item: ReportResponse) => void;
  s: S; t: Translations; isExpanded: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} onPress={onToggle} activeOpacity={0.85}>
      <View style={[s.accentBar, { backgroundColor: '#7C3AED' }]} />
      <View style={s.cardInner}>
        <View style={s.cardHeader}>
          <View style={[s.severityBadge, { backgroundColor: '#7C3AED' }]}>
            <AppText style={s.severityText}>{t.feed.citizen.toUpperCase()}</AppText>
          </View>
          <View style={[s.lifecycleBadge, { borderColor: LifecycleColors[item.lifecycle] }]}>
            <AppText style={[s.lifecycleText, { color: LifecycleColors[item.lifecycle] }]}>
              {item.lifecycle}
            </AppText>
          </View>
          <AppText style={s.timeAgo}>{timeAgo(item.submitted_at)}</AppText>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
        </View>

        <AppText style={s.title}>{getReportTitle(item.description, t)}</AppText>
        <AppText style={s.description} numberOfLines={isExpanded ? undefined : 2}>
          {item.description}
        </AppText>

        <View style={s.cardFooter}>
          <View style={s.locationBlock}>
            <View style={s.locationRow}>
              <Ionicons name="location-sharp" size={13} color="#7C3AED" />
              <AppText style={s.locationText}>{item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E</AppText>
            </View>
          </View>
          <TouchableOpacity style={s.mapBtn} onPress={() => onViewMap(item)} activeOpacity={0.7}>
            <Ionicons name="map-outline" size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <>
            <View style={s.expandDivider} />
            <View style={s.expandRow}>
              <AppText style={s.expandLabel}>{t.common.submitted}</AppText>
              <AppText style={s.expandValue}>{fullDate(item.submitted_at)}</AppText>
            </View>
            <View style={s.expandRow}>
              <AppText style={s.expandLabel}>{t.feed.coordinates}</AppText>
              <AppText style={s.expandValue}>{item.latitude.toFixed(6)}°N, {item.longitude.toFixed(6)}°E</AppText>
            </View>
            {!!item.image_url && (
              <View style={s.expandRow}>
                <AppText style={s.expandLabel}>{t.report.photo}</AppText>
                <AppText style={s.expandValue}>{t.feed.attached}</AppText>
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}
