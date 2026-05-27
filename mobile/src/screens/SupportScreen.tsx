import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LightTheme, DarkTheme, AppTheme } from '../constants/colors';
import { AppText } from '../components/AppText';

// ─── Data ────────────────────────────────────────────────────────────────────

const SOS_IDS = ['police', 'fire', 'ambulance'] as const;
type SosId = typeof SOS_IDS[number];

const SOS_PHONES: Record<SosId, string> = {
  police:    '100',
  fire:      '101',
  ambulance: '102',
};
const SOS_ICONS: Record<SosId, string> = {
  police:    'shield',
  fire:      'flame',
  ambulance: 'medkit',
};

interface Contact {
  id: string;
  name: string;
  role_en: string;
  role_ne: string;
  phone: string;
  icon: string;
  color: string;
}

const GOVERNMENT_CONTACTS: Contact[] = [
  {
    id: 'g1',
    name: 'Nepal Army',
    role_en: 'Disaster rescue & relief operations',
    role_ne: 'विपद् उद्धार तथा राहत सञ्चालन',
    phone: '115', icon: 'shield-checkmark', color: '#2563EB',
  },
  {
    id: 'g2',
    name: 'NDRRMA',
    role_en: 'National Disaster Risk Reduction & Mgmt Authority',
    role_ne: 'राष्ट्रिय विपद् जोखिम न्यूनीकरण प्राधिकरण',
    phone: '+977-1-4200045', icon: 'alert-circle', color: '#7C3AED',
  },
];

const NGO_CONTACTS: Contact[] = [
  {
    id: 'n1',
    name: 'Nepal Red Cross Society',
    role_en: 'Humanitarian response & relief',
    role_ne: 'मानवीय प्रतिक्रिया र राहत',
    phone: '+977-1-4270650', icon: 'heart', color: '#DC2626',
  },
  {
    id: 'n2',
    name: 'UNICEF Nepal',
    role_en: 'Child protection & emergency relief',
    role_ne: 'बाल संरक्षण तथा आपतकालीन राहत',
    phone: '+977-1-5537333', icon: 'people', color: '#0EA5E9',
  },
  {
    id: 'n3',
    name: 'Oxfam Nepal',
    role_en: 'Disaster relief, water & sanitation',
    role_ne: 'विपद् राहत, पानी र सरसफाई',
    phone: '+977-1-5547465', icon: 'water', color: '#16A34A',
  },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    scroll:    { paddingBottom: 40 },

    header:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
    heading:    { fontSize: 26, fontWeight: '800', color: t.text },
    subheading: { fontSize: 13, color: t.subtext, marginTop: 2, marginBottom: 20 },

    sosBanner: {
      marginHorizontal: 16, marginBottom: 24,
      backgroundColor: '#DC2626', borderRadius: 14, padding: 16,
    },
    sosBannerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sosIcon:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    sosBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    sosBannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
    sosButtons:    { flexDirection: 'row', gap: 8 },
    sosBtn: {
      flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 10, paddingVertical: 12,
      alignItems: 'center', justifyContent: 'center', gap: 4,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    sosBtnNumber: { fontSize: 22, fontWeight: '900', color: '#fff' },
    sosBtnLabel:  { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3 },

    sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
    sectionTitle:   { fontSize: 13, fontWeight: '800', color: t.sectionTitle, letterSpacing: 0.4, textTransform: 'uppercase' },
    sectionDivider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.border },

    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: t.card, borderRadius: 12,
      marginHorizontal: 16, marginBottom: 10, padding: 14,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
    },
    iconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardBody: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: '700', color: t.text },
    cardRole: { fontSize: 12, color: t.subtext, marginTop: 2, lineHeight: 16 },
    callBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
    callBtnText: { fontSize: 13, fontWeight: '700' },

    sectionGap: { height: 20 },
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.sectionHeader}>
      <AppText style={s.sectionTitle}>{label}</AppText>
      <View style={s.sectionDivider} />
    </View>
  );
}

function ContactCard({ item, lang }: { item: Contact; lang: string }) {
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(theme), [theme]);
  const call = () => Linking.openURL(`tel:${item.phone}`);
  return (
    <TouchableOpacity style={s.card} onPress={call} activeOpacity={0.75}>
      <View style={[s.iconWrap, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <View style={s.cardBody}>
        <AppText style={s.cardName}>{item.name}</AppText>
        <AppText style={s.cardRole}>
          {lang === 'ne' ? item.role_ne : item.role_en}
        </AppText>
      </View>
      <TouchableOpacity
        style={[s.callBtn, { borderColor: item.color + '55', backgroundColor: item.color + '10' }]}
        onPress={call}
        activeOpacity={0.7}
      >
        <Ionicons name="call" size={13} color={item.color} />
        <AppText style={[s.callBtnText, { color: item.color }]}>{item.phone}</AppText>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SupportScreen() {
  const { isDark } = useTheme();
  const { t, lang } = useLanguage();
  const theme = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(theme), [theme]);

  const call = (phone: string) => Linking.openURL(`tel:${phone}`);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <AppText style={s.heading}>{t.support.heading}</AppText>
          <AppText style={s.subheading}>{t.support.subheading}</AppText>
        </View>

        {/* SOS Banner */}
        <View style={s.sosBanner}>
          <View style={s.sosBannerRow}>
            <View style={s.sosIcon}>
              <Ionicons name="warning" size={20} color="#fff" />
            </View>
            <View>
              <AppText style={s.sosBannerTitle}>{t.support.inDanger}</AppText>
              <AppText style={s.sosBannerSub}>{t.support.tapToCall}</AppText>
            </View>
          </View>
          <View style={s.sosButtons}>
            {SOS_IDS.map(id => (
              <TouchableOpacity
                key={id}
                style={s.sosBtn}
                onPress={() => call(SOS_PHONES[id])}
                activeOpacity={0.7}
              >
                <Ionicons name={SOS_ICONS[id] as any} size={18} color="#fff" />
                <AppText style={s.sosBtnNumber}>{SOS_PHONES[id]}</AppText>
                <AppText style={s.sosBtnLabel}>
                  {t.support[id].toUpperCase()}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Government */}
        <SectionHeader label={t.support.government} />
        {GOVERNMENT_CONTACTS.map(c => <ContactCard key={c.id} item={c} lang={lang} />)}

        <View style={s.sectionGap} />

        {/* NGOs */}
        <SectionHeader label={t.support.ngos} />
        {NGO_CONTACTS.map(c => <ContactCard key={c.id} item={c} lang={lang} />)}

      </ScrollView>
    </SafeAreaView>
  );
}
