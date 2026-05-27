import React, { useState, useEffect, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Location from 'expo-location';
import { SeverityColors, LifecycleColors, LightTheme, DarkTheme, AppTheme } from '../constants/colors';
import { RootTabParamList } from '../navigation/AppNavigator';
import { useIncidents } from '../context/IncidentsContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AppText } from '../components/AppText';

type Nav = BottomTabNavigationProp<RootTabParamList>;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NAV_CARD_DEFS: { tab: keyof RootTabParamList; icon: string; color: string }[] = [
  { tab: 'Feed',          icon: 'list',       color: '#2563EB' },
  { tab: 'LiveMap',       icon: 'map',        color: '#059669' },
  { tab: 'CitizenReport', icon: 'add-circle', color: '#DC2626' },
  { tab: 'Support',       icon: 'call',       color: '#7C3AED' },
];

const GUIDE_ICONS = ['warning', 'water', 'earth'];

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: t.bg },
    scroll:       { paddingBottom: 32 },
    header:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    headerRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    appName:      { fontSize: 26, fontWeight: '800', color: t.text },
    subtitle:     { fontSize: 13, color: t.subtext, marginTop: 2 },
    themeBtn:     { padding: 8, borderRadius: 8, marginTop: 2 },
    headerBtns:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
    langBtn: {
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
      borderWidth: 1.5, borderColor: t.pillBorder, backgroundColor: t.card,
    },
    langBtnText:  { fontSize: 12, fontWeight: '800', color: t.sectionTitle },

    alertBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#DC2626', marginHorizontal: 16, marginBottom: 12,
      borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    },
    alertText:    { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },

    statsRow:     { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
    statChip: {
      flex: 1, alignItems: 'center', borderRadius: 8, borderWidth: 1.5,
      paddingVertical: 8, backgroundColor: t.card,
    },
    statNum:      { fontSize: 22, fontWeight: '800' },
    statLabel:    { fontSize: 9, fontWeight: '700', color: t.statLabel, marginTop: 1 },

    sectionTitle: { fontSize: 15, fontWeight: '700', color: t.sectionTitle, paddingHorizontal: 16, marginBottom: 10 },

    navGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 24 },
    navCard: {
      width: '47%', backgroundColor: t.card, borderRadius: 12, padding: 14,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    navIcon:      { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    navLabel:     { fontSize: 14, fontWeight: '700', color: t.text },
    navDesc:      { fontSize: 11, color: t.muted, marginTop: 2 },

    guideCard: {
      backgroundColor: t.card, marginHorizontal: 16, marginBottom: 10,
      borderRadius: 12, padding: 14,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    guideHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    guideIconWrap:{ width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    guideType:    { fontSize: 15, fontWeight: '700' },
    tipRow:       { flexDirection: 'row', gap: 10, marginBottom: 6 },
    tipNum:       { fontSize: 13, fontWeight: '800', width: 16 },
    tipText:      { fontSize: 13, color: t.tipText, flex: 1, lineHeight: 18 },

    nearbyLoader:   { marginLeft: 16, marginBottom: 20, alignSelf: 'flex-start' },
    locationPrompt: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 20 },
    locationPromptText: { fontSize: 13, color: t.muted },

    nearbyScroll:   { paddingHorizontal: 16, gap: 10, paddingBottom: 20 },
    nearbyCard: {
      flexDirection: 'row', width: 180, backgroundColor: t.card, borderRadius: 10,
      overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    nearbySeverityBar: { width: 5 },
    nearbyContent:  { padding: 12, flex: 1 },
    nearbyTitle:    { fontSize: 13, fontWeight: '700', color: t.text, lineHeight: 18, marginBottom: 4 },
    nearbyDist:     { fontSize: 11, color: t.subtext, marginBottom: 8 },
    lifecycleBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    lifecycleBadgeText: { fontSize: 10, fontWeight: '700' },
  });
}

const SEV_LABEL_KEY = {
  CRITICAL: 'critical',
  HIGH:     'high',
  MODERATE: 'moderate',
  LOW:      'low',
} as const;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { incidents, loading, refreshing, refresh } = useIncidents();
  const { isDark, toggleTheme } = useTheme();
  const { lang, t, toggleLanguage } = useLanguage();
  const theme = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      setUserCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    })();
  }, []);

  const nearbyRisks = userCoords
    ? incidents
        .filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL')
        .map(i => ({ ...i, distanceKm: haversineKm(userCoords.lat, userCoords.lon, i.latitude, i.longitude) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3)
    : [];

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
            <View style={s.headerRow}>
              <View>
                <AppText style={s.appName}>{t.dashboard.appName}</AppText>
                <AppText style={s.subtitle}>
                  {incidents.length} {t.dashboard.trackedSuffix} · {active} {t.dashboard.activeSuffix}
                </AppText>
              </View>
              <View style={s.headerBtns}>
                <TouchableOpacity onPress={toggleLanguage} style={s.langBtn} activeOpacity={0.7}>
                  <AppText style={s.langBtnText}>{lang === 'en' ? 'NE' : 'EN'}</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleTheme} style={s.themeBtn} activeOpacity={0.7}>
                  <Ionicons
                    name={isDark ? 'sunny' : 'moon'}
                    size={22}
                    color={isDark ? '#FBBF24' : '#6B7280'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Alert banner */}
          {critical > 0 && (
            <View style={s.alertBanner}>
              <Ionicons name="alert-circle" size={18} color="#fff" />
              <AppText style={s.alertText}>
                {critical} {t.common.critical.toUpperCase()}{high > 0 ? ` · ${high} ${t.common.high.toUpperCase()}` : ''} incident{critical + high !== 1 ? 's' : ''}
              </AppText>
            </View>
          )}

          {/* Severity summary */}
          <View style={s.statsRow}>
            {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(sev => (
              <View key={sev} style={[s.statChip, { borderColor: SeverityColors[sev] }]}>
                <AppText style={[s.statNum, { color: SeverityColors[sev] }]}>
                  {incidents.filter(i => i.severity === sev).length}
                </AppText>
                <AppText style={s.statLabel}>{t.common[SEV_LABEL_KEY[sev]]}</AppText>
              </View>
            ))}
          </View>

          {/* Nearby Risk */}
          <AppText style={s.sectionTitle}>{t.dashboard.nearbyRisk}</AppText>
          {locationDenied ? (
            <View style={s.locationPrompt}>
              <Ionicons name="location-outline" size={15} color={theme.muted} />
              <AppText style={s.locationPromptText}>{t.dashboard.enableLocation}</AppText>
            </View>
          ) : !userCoords ? (
            <ActivityIndicator size="small" color={theme.muted} style={s.nearbyLoader} />
          ) : nearbyRisks.length === 0 ? (
            <View style={s.locationPrompt}>
              <Ionicons name="checkmark-circle-outline" size={15} color={theme.muted} />
              <AppText style={s.locationPromptText}>{t.dashboard.noNearby}</AppText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.nearbyScroll}
            >
              {nearbyRisks.map(incident => (
                <View key={incident.id} style={s.nearbyCard}>
                  <View style={[s.nearbySeverityBar, { backgroundColor: SeverityColors[incident.severity] }]} />
                  <View style={s.nearbyContent}>
                    <AppText style={s.nearbyTitle} numberOfLines={2}>
                      {lang === 'ne' && incident.title_ne ? incident.title_ne : incident.title}
                    </AppText>
                    <AppText style={s.nearbyDist}>{incident.distanceKm.toFixed(1)} {t.dashboard.kmAway}</AppText>
                    <View style={[s.lifecycleBadge, { backgroundColor: LifecycleColors[incident.lifecycle] + '22' }]}>
                      <AppText style={[s.lifecycleBadgeText, { color: LifecycleColors[incident.lifecycle] }]}>
                        {incident.lifecycle}
                      </AppText>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Quick access nav cards */}
          <AppText style={s.sectionTitle}>{t.dashboard.quickAccess}</AppText>
          <View style={s.navGrid}>
            {([
              { ...NAV_CARD_DEFS[0], label: t.dashboard.navCards.feedLabel,    desc: t.dashboard.navCards.feedDesc    },
              { ...NAV_CARD_DEFS[1], label: t.dashboard.navCards.mapLabel,     desc: t.dashboard.navCards.mapDesc     },
              { ...NAV_CARD_DEFS[2], label: t.dashboard.navCards.reportLabel,  desc: t.dashboard.navCards.reportDesc  },
              { ...NAV_CARD_DEFS[3], label: t.dashboard.navCards.supportLabel, desc: t.dashboard.navCards.supportDesc },
            ]).map(card => (
              <TouchableOpacity
                key={card.tab}
                style={s.navCard}
                onPress={() => navigation.navigate(card.tab as any)}
                activeOpacity={0.7}
              >
                <View style={[s.navIcon, { backgroundColor: card.color + '18' }]}>
                  <Ionicons name={card.icon as any} size={26} color={card.color} />
                </View>
                <AppText style={s.navLabel}>{card.label}</AppText>
                <AppText style={s.navDesc}>{card.desc}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Emergency guides */}
          <AppText style={s.sectionTitle}>{t.dashboard.guides}</AppText>
          {t.dashboard.guideData.map((guide, gi) => {
            const colors = ['#DC2626', '#2563EB', '#92400E'];
            const color = colors[gi];
            return (
              <View key={guide.type} style={s.guideCard}>
                <View style={s.guideHeader}>
                  <View style={[s.guideIconWrap, { backgroundColor: color + '18' }]}>
                    <Ionicons name={GUIDE_ICONS[gi] as any} size={20} color={color} />
                  </View>
                  <AppText style={[s.guideType, { color }]}>{guide.type}</AppText>
                </View>
                {guide.tips.map((tip, i) => (
                  <View key={i} style={s.tipRow}>
                    <AppText style={[s.tipNum, { color }]}>{i + 1}</AppText>
                    <AppText style={s.tipText}>{tip}</AppText>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
