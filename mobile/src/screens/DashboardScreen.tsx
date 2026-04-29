import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SeverityColors } from '../constants/colors';
import { RootTabParamList } from '../navigation/AppNavigator';
import { useIncidents } from '../context/IncidentsContext';

type Nav = BottomTabNavigationProp<RootTabParamList>;

const NAV_CARDS: {
  tab: keyof RootTabParamList;
  label: string;
  icon: string;
  color: string;
  description: string;
}[] = [
  { tab: 'Feed',          label: 'Incident Feed', icon: 'list',       color: '#2563EB', description: 'All active incidents' },
  { tab: 'LiveMap',       label: 'Live Map',      icon: 'map',        color: '#059669', description: 'Heatmap & GeoPins' },
  { tab: 'CitizenReport', label: 'Report',        icon: 'add-circle', color: '#DC2626', description: 'Submit a new report' },
  { tab: 'Support',       label: 'Support',       icon: 'call',       color: '#7C3AED', description: 'Contacts & NGOs' },
];

const GUIDES = [
  {
    type: 'Earthquake',
    icon: 'warning',
    color: '#DC2626',
    tips: ['Drop, Cover, Hold On', 'Stay away from windows', 'Do not use elevators', 'Once safe, move to open ground'],
  },
  {
    type: 'Flood',
    icon: 'water',
    color: '#2563EB',
    tips: ['Move to higher ground immediately', 'Do not walk through moving water', 'Avoid bridges over fast water', 'Follow evacuation routes'],
  },
  {
    type: 'Landslide',
    icon: 'earth',
    color: '#92400E',
    tips: ['Evacuate immediately', 'Alert nearby neighbors', 'Move away from the slide path', 'Do not re-enter until cleared'],
  },
];

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { incidents, loading, refreshing, refresh } = useIncidents();

  const critical = incidents.filter(i => i.severity === 'CRITICAL').length;
  const high     = incidents.filter(i => i.severity === 'HIGH').length;
  const active   = incidents.filter(i => i.lifecycle === 'ACTIVE').length;

  return (
    <SafeAreaView style={s.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#DC2626" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={s.scroll}
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.appName}>Nepal Disaster Hub</Text>
            <Text style={s.subtitle}>
              {incidents.length} incidents tracked · {active} active
            </Text>
          </View>

          {/* Alert banner */}
          {critical > 0 && (
            <View style={s.alertBanner}>
              <Ionicons name="alert-circle" size={18} color="#fff" />
              <Text style={s.alertText}>
                {critical} CRITICAL{high > 0 ? ` · ${high} HIGH` : ''} incident{critical + high !== 1 ? 's' : ''} right now
              </Text>
            </View>
          )}

          {/* Severity summary */}
          <View style={s.statsRow}>
            {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(sev => (
              <View key={sev} style={[s.statChip, { borderColor: SeverityColors[sev] }]}>
                <Text style={[s.statNum, { color: SeverityColors[sev] }]}>
                  {incidents.filter(i => i.severity === sev).length}
                </Text>
                <Text style={s.statLabel}>{sev}</Text>
              </View>
            ))}
          </View>

          {/* Quick access nav cards */}
          <Text style={s.sectionTitle}>Quick Access</Text>
          <View style={s.navGrid}>
            {NAV_CARDS.map(card => (
              <TouchableOpacity
                key={card.tab}
                style={s.navCard}
                onPress={() => navigation.navigate(card.tab as any)}
                activeOpacity={0.7}
              >
                <View style={[s.navIcon, { backgroundColor: card.color + '18' }]}>
                  <Ionicons name={card.icon as any} size={26} color={card.color} />
                </View>
                <Text style={s.navLabel}>{card.label}</Text>
                <Text style={s.navDesc}>{card.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Emergency guides */}
          <Text style={s.sectionTitle}>Emergency Guides</Text>
          {GUIDES.map(guide => (
            <View key={guide.type} style={s.guideCard}>
              <View style={s.guideHeader}>
                <View style={[s.guideIconWrap, { backgroundColor: guide.color + '18' }]}>
                  <Ionicons name={guide.icon as any} size={20} color={guide.color} />
                </View>
                <Text style={[s.guideType, { color: guide.color }]}>{guide.type}</Text>
              </View>
              {guide.tips.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <Text style={[s.tipNum, { color: guide.color }]}>{i + 1}</Text>
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:       { paddingBottom: 32 },
  header:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  appName:      { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle:     { fontSize: 13, color: '#6B7280', marginTop: 2 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DC2626', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
  },
  alertText:    { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },

  statsRow:     { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  statChip: {
    flex: 1, alignItems: 'center', borderRadius: 8, borderWidth: 1.5,
    paddingVertical: 8, backgroundColor: '#fff',
  },
  statNum:      { fontSize: 22, fontWeight: '800' },
  statLabel:    { fontSize: 9, fontWeight: '700', color: '#6B7280', marginTop: 1 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', paddingHorizontal: 16, marginBottom: 10 },

  navGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 24 },
  navCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  navIcon:      { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  navLabel:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  navDesc:      { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  guideCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  guideHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  guideIconWrap:{ width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  guideType:    { fontSize: 15, fontWeight: '700' },
  tipRow:       { flexDirection: 'row', gap: 10, marginBottom: 6 },
  tipNum:       { fontSize: 13, fontWeight: '800', width: 16 },
  tipText:      { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
});
