import React, { useMemo, useState } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../constants/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LightTheme, DarkTheme, AppTheme } from '../constants/colors';
import { AppText } from '../components/AppText';
import { Translations } from '../constants/translations';

const DISASTER_TYPES = [
  { key: 'Flood',          icon: 'water',                color: '#0EA5E9' },
  { key: 'Earthquake',     icon: 'warning',              color: '#F97316' },
  { key: 'Landslide',      icon: 'earth',                color: '#92400E' },
  { key: 'Heavy Rainfall', icon: 'rainy',                color: '#0369A1' },
  { key: 'Road Closed',    icon: 'close-circle-outline', color: '#6B7280' },
  { key: 'Wildfire',       icon: 'flame',                color: '#DC2626' },
  { key: 'Fire',           icon: 'flame-outline',        color: '#EA580C' },
  { key: 'Other',          icon: 'help-circle-outline',  color: '#9CA3AF' },
] as const;

const SEVERITY_LEVELS = [
  { key: 'LOW',      color: '#16A34A' },
  { key: 'MODERATE', color: '#D97706' },
  { key: 'HIGH',     color: '#EA580C' },
  { key: 'CRITICAL', color: '#DC2626' },
] as const;

type DisasterType = typeof DISASTER_TYPES[number]['key'] | null;
type SeverityKey  = typeof SEVERITY_LEVELS[number]['key'] | null;

function getTypeLabel(key: string, t: Translations): string {
  const map: Record<string, string> = {
    'Flood':          t.common.flood,
    'Earthquake':     t.common.earthquake,
    'Landslide':      t.common.landslide,
    'Heavy Rainfall': t.common.heavyRain,
    'Road Closed':    t.common.roadClosed,
    'Wildfire':       t.common.wildfire,
    'Fire':           t.common.fire,
    'Other':          t.common.other,
  };
  return map[key] ?? key;
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    inner:     { padding: 16, paddingBottom: 48 },

    heading:    { fontSize: 24, fontWeight: '800', color: t.text, marginBottom: 2 },
    subheading: { fontSize: 13, color: t.subtext, marginBottom: 28 },

    sectionBlock: { marginBottom: 22 },
    labelRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: t.sectionTitle },
    optionalTag:  { fontSize: 11, color: t.muted, fontStyle: 'italic' },
    requiredStar: { fontSize: 13, fontWeight: '700', color: '#DC2626' },

    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeCard: {
      width: '31.5%', height: 86, backgroundColor: t.card,
      borderRadius: 12, borderWidth: 2, borderColor: 'transparent',
      alignItems: 'center', justifyContent: 'center', gap: 6,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    typeIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    typeLabel:    { fontSize: 11, fontWeight: '700', color: t.subtext, textAlign: 'center' },

    severityRow: { flexDirection: 'row', height: 44, gap: 3 },
    severitySegment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    segFirst:   { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
    segLast:    { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
    severityLabelRow: { flexDirection: 'row', marginTop: 5 },
    severityLevelLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: t.muted },

    textarea: {
      backgroundColor: t.inputBg, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: t.inputBorder, fontSize: 14,
      color: t.inputText, minHeight: 72,
    },

    locationBtn: {
      backgroundColor: '#2563EB', borderRadius: 10, padding: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    locationBtnSet:     { borderWidth: 1.5, borderColor: '#2563EB', backgroundColor: t.card },
    locationBtnText:    { color: '#fff', fontWeight: '600', fontSize: 14 },
    locationBtnTextSet: { color: '#2563EB' },
    locationCoords:     { fontSize: 12, color: '#2563EB', marginTop: 6, textAlign: 'center', fontWeight: '600' },

    photoBtn: {
      backgroundColor: t.card, borderRadius: 10, padding: 14,
      borderWidth: 1, borderColor: t.border,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    photoBtnText: { color: t.sectionTitle, fontWeight: '600', fontSize: 14 },
    preview:      { width: '100%', height: 180, borderRadius: 10, marginTop: 10 },

    submitBtn: {
      backgroundColor: '#DC2626', borderRadius: 12, padding: 16,
      alignItems: 'center', marginTop: 8,
      flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  });
}

export default function CitizenReportScreen() {
  const { isDark } = useTheme();
  const { t, toggleLanguage, lang } = useLanguage();
  const theme = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [disasterType, setDisasterType] = useState<DisasterType>(null);
  const [otherTypeText, setOtherTypeText] = useState('');
  const [severity, setSeverity]         = useState<SeverityKey>(null);
  const [description, setDescription]   = useState('');
  const [location, setLocation]         = useState<{ latitude: number; longitude: number } | null>(null);
  const [imageUri, setImageUri]         = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [locating, setLocating]         = useState(false);

  const selectedSevIdx = SEVERITY_LEVELS.findIndex(l => l.key === severity);

  const toggleType = (key: DisasterType) => {
    setDisasterType(prev => (prev === key ? null : key));
    if (key !== 'Other') setOtherTypeText('');
  };

  const toggleSeverity = (key: SeverityKey) =>
    setSeverity(prev => (prev === key ? null : key));

  const detectLocation = async () => {
    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.report.permissionDenied, t.report.locationDenied);
      setLocating(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    setLocating(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.report.permissionDenied, t.report.photoDenied);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!disasterType) {
      Alert.alert(t.report.typeRequired, t.report.typeRequiredMsg);
      return;
    }
    if (!location) {
      Alert.alert(t.report.locationRequired, t.report.locationRequiredMsg);
      return;
    }

    const resolvedType = disasterType === 'Other' && otherTypeText.trim()
      ? otherTypeText.trim()
      : disasterType;
    const parts: string[] = [`Type: ${resolvedType}`];
    if (severity) parts.push(`Severity: ${severity}`);
    if (description.trim()) parts.push(description.trim());
    const finalDescription = parts.join('\n');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: finalDescription, ...location }),
      });
      if (res.ok) {
        Alert.alert(t.common.submitted, t.report.successMsg);
        setDisasterType(null);
        setOtherTypeText('');
        setSeverity(null);
        setDescription('');
        setLocation(null);
        setImageUri(null);
      } else {
        Alert.alert(t.common.error, t.report.failMsg);
      }
    } catch {
      Alert.alert(t.common.error, t.report.networkErr);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!disasterType && !!location;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

        <AppText style={s.heading}>{t.report.heading}</AppText>
        <AppText style={s.subheading}>{t.report.subheading}</AppText>

        {/* ── Disaster type grid ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <AppText style={s.sectionLabel}>{t.report.whatHappening}</AppText>
            <AppText style={s.requiredStar}>*</AppText>
          </View>
          <View style={s.typeGrid}>
            {DISASTER_TYPES.map(type => {
              const active = disasterType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[s.typeCard, active && { borderColor: type.color }]}
                  onPress={() => toggleType(type.key)}
                  activeOpacity={0.75}
                >
                  <View style={[s.typeIconWrap, { backgroundColor: active ? type.color : type.color + '18' }]}>
                    <Ionicons name={type.icon as any} size={22} color={active ? '#fff' : type.color} />
                  </View>
                  <AppText style={[s.typeLabel, active && { color: type.color }]}>
                    {getTypeLabel(type.key, t)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
          {disasterType === 'Other' && (
            <TextInput
              style={[s.textarea, { marginTop: 10, minHeight: 44 }]}
              placeholder={t.report.otherPlaceholder}
              placeholderTextColor={theme.muted}
              value={otherTypeText}
              onChangeText={setOtherTypeText}
              autoFocus
            />
          )}
        </View>

        {/* ── Severity stepper ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <AppText style={s.sectionLabel}>{t.report.howUrgent}</AppText>
            <AppText style={s.optionalTag}>{t.common.optional}</AppText>
          </View>
          <View style={s.severityRow}>
            {SEVERITY_LEVELS.map((level, i) => {
              const filled = selectedSevIdx >= 0 && i <= selectedSevIdx;
              return (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    s.severitySegment,
                    { backgroundColor: filled ? level.color : theme.border },
                    i === 0 && s.segFirst,
                    i === SEVERITY_LEVELS.length - 1 && s.segLast,
                  ]}
                  onPress={() => toggleSeverity(level.key)}
                  activeOpacity={0.8}
                />
              );
            })}
          </View>
          <View style={s.severityLabelRow}>
            {SEVERITY_LEVELS.map((level, i) => {
              const filled = selectedSevIdx >= 0 && i <= selectedSevIdx;
              return (
                <AppText
                  key={level.key}
                  style={[s.severityLevelLabel, filled && { color: level.color, fontWeight: '700' }]}
                >
                  {level.key === 'LOW' ? t.common.low : level.key === 'MODERATE' ? t.common.moderate : level.key === 'HIGH' ? t.common.high : t.common.critical}
                </AppText>
              );
            })}
          </View>
        </View>

        {/* ── Location ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <AppText style={s.sectionLabel}>{t.report.yourLocation}</AppText>
            <AppText style={s.requiredStar}>*</AppText>
          </View>
          <TouchableOpacity
            style={[s.locationBtn, location && s.locationBtnSet]}
            onPress={detectLocation}
            disabled={locating}
            activeOpacity={0.8}
          >
            {locating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={location ? 'location-sharp' : 'location-outline'} size={18} color={location ? '#2563EB' : '#fff'} />
                <AppText style={[s.locationBtnText, location && s.locationBtnTextSet]}>
                  {location ? t.report.locationSet : t.report.detectLocation}
                </AppText>
              </>
            )}
          </TouchableOpacity>
          {location && (
            <AppText style={s.locationCoords}>
              {location.latitude.toFixed(5)}°N · {location.longitude.toFixed(5)}°E
            </AppText>
          )}
        </View>

        {/* ── Description (optional) ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <AppText style={s.sectionLabel}>{t.report.moreDetails}</AppText>
            <AppText style={s.optionalTag}>{t.common.optional}</AppText>
          </View>
          <TextInput
            style={s.textarea}
            placeholder={t.report.detailsPlaceholder}
            placeholderTextColor={theme.muted}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {/* ── Photo (optional) ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <AppText style={s.sectionLabel}>{t.report.photo}</AppText>
            <AppText style={s.optionalTag}>{t.common.optional}</AppText>
          </View>
          <TouchableOpacity style={s.photoBtn} onPress={pickImage} activeOpacity={0.8}>
            <Ionicons name={imageUri ? 'camera' : 'camera-outline'} size={18} color={theme.sectionTitle} />
            <AppText style={s.photoBtnText}>{imageUri ? t.report.changePhoto : t.report.attachPhoto}</AppText>
          </TouchableOpacity>
          {imageUri && <Image source={{ uri: imageUri }} style={s.preview} />}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          onPress={submit}
          disabled={submitting || !canSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <AppText style={s.submitText}>{t.report.submitBtn}</AppText>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
