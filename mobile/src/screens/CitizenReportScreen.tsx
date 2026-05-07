import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../constants/api';
import { useTheme } from '../context/ThemeContext';
import { LightTheme, DarkTheme, AppTheme } from '../constants/colors';



const DISASTER_TYPES = [
  { key: 'Flood',      label: 'Flood',      icon: 'water',                color: '#0EA5E9' },
  { key: 'Earthquake', label: 'Earthquake', icon: 'warning',              color: '#F97316' },
  { key: 'Landslide',  label: 'Landslide',  icon: 'earth',                color: '#92400E' },
  { key: 'Wildfire',   label: 'Wildfire',   icon: 'flame',                color: '#DC2626' },
  { key: 'Fire',       label: 'Fire',       icon: 'flame-outline',        color: '#EA580C' },
  { key: 'Other',      label: 'Other',      icon: 'help-circle-outline',  color: '#6B7280' },
] as const;

const SEVERITY_LEVELS = [
  { key: 'LOW',      label: 'Low',      color: '#16A34A' },
  { key: 'MODERATE', label: 'Moderate', color: '#D97706' },
  { key: 'HIGH',     label: 'High',     color: '#EA580C' },
  { key: 'CRITICAL', label: 'Critical', color: '#DC2626' },
] as const;

type DisasterType = typeof DISASTER_TYPES[number]['key'] | null;
type SeverityKey  = typeof SEVERITY_LEVELS[number]['key'] | null;



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


    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeCard: {
      width: '31.5%',
      height: 86,
      backgroundColor: t.card,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    typeIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: t.subtext,
      textAlign: 'center',
    },

    severityRow: {
      flexDirection: 'row',
      height: 44,
      gap: 3,
    },
    severitySegment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segFirst: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
    segLast:  { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
    severityLabelRow: {
      flexDirection: 'row',
      marginTop: 5,
    },
    severityLevelLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: '600',
      color: t.muted,
    },

    textarea: {
      backgroundColor: t.inputBg,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: t.inputBorder,
      fontSize: 14,
      color: t.inputText,
      minHeight: 72,
    },

    locationBtn: {
      backgroundColor: '#2563EB',
      borderRadius: 10,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    locationBtnSet: {
      borderWidth: 1.5,
      borderColor: '#2563EB',
      backgroundColor: t.card,
    },
    locationBtnText:    { color: '#fff', fontWeight: '600', fontSize: 14 },
    locationBtnTextSet: { color: '#2563EB' },
    locationCoords:     { fontSize: 12, color: '#2563EB', marginTop: 6, textAlign: 'center', fontWeight: '600' },

    photoBtn: {
      backgroundColor: t.card,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    photoBtnText: { color: t.sectionTitle, fontWeight: '600', fontSize: 14 },
    preview:      { width: '100%', height: 180, borderRadius: 10, marginTop: 10 },

    submitBtn: {
      backgroundColor: '#DC2626',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  });
}


export default function CitizenReportScreen() {
  const { isDark } = useTheme();
  const t = isDark ? DarkTheme : LightTheme;
  const s = useMemo(() => makeStyles(t), [t]);

  const [disasterType, setDisasterType] = useState<DisasterType>(null);
  const [severity, setSeverity]         = useState<SeverityKey>(null);
  const [description, setDescription]   = useState('');
  const [location, setLocation]         = useState<{ latitude: number; longitude: number } | null>(null);
  const [imageUri, setImageUri]         = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [locating, setLocating]         = useState(false);

  const selectedSevIdx = SEVERITY_LEVELS.findIndex(l => l.key === severity);


  const toggleType = (key: DisasterType) =>
    setDisasterType(prev => (prev === key ? null : key));

  const toggleSeverity = (key: SeverityKey) =>
    setSeverity(prev => (prev === key ? null : key));

  const detectLocation = async () => {
    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is needed to pin your report.');
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
      Alert.alert('Permission denied', 'Photo access is needed to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!disasterType) {
      Alert.alert('Disaster type required', 'Tap what kind of disaster this is.');
      return;
    }
    if (!location) {
      Alert.alert('Location required', 'Tap "Detect My Location" before submitting.');
      return;
    }

    // Embed type + severity into description — same API payload, no backend changes
    const parts: string[] = [`Type: ${disasterType}`];
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
        Alert.alert('Submitted', 'Your report has been received. Thank you.');
        setDisasterType(null);
        setSeverity(null);
        setDescription('');
        setLocation(null);
        setImageUri(null);
      } else {
        Alert.alert('Error', 'Failed to submit. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach the server. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!disasterType && !!location;


  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

        <Text style={s.heading}>Report an Incident</Text>
        <Text style={s.subheading}>Quick tap — every second counts.</Text>

        {/* ── Disaster type grid ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <Text style={s.sectionLabel}>What's happening?</Text>
            <Text style={s.requiredStar}>*</Text>
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
                  <View style={[
                    s.typeIconWrap,
                    { backgroundColor: active ? type.color : type.color + '18' },
                  ]}>
                    <Ionicons
                      name={type.icon as any}
                      size={22}
                      color={active ? '#fff' : type.color}
                    />
                  </View>
                  <Text style={[s.typeLabel, active && { color: type.color }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Severity stepper ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <Text style={s.sectionLabel}>How urgent is this?</Text>
            <Text style={s.optionalTag}>optional</Text>
          </View>
          <View style={s.severityRow}>
            {SEVERITY_LEVELS.map((level, i) => {
              const filled = selectedSevIdx >= 0 && i <= selectedSevIdx;
              return (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    s.severitySegment,
                    { backgroundColor: filled ? level.color : t.border },
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
                <Text
                  key={level.key}
                  style={[
                    s.severityLevelLabel,
                    filled && { color: level.color, fontWeight: '700' },
                  ]}
                >
                  {level.label}
                </Text>
              );
            })}
          </View>
        </View>

        {/* ── Location ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <Text style={s.sectionLabel}>Your location</Text>
            <Text style={s.requiredStar}>*</Text>
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
                <Ionicons
                  name={location ? 'location-sharp' : 'location-outline'}
                  size={18}
                  color={location ? '#2563EB' : '#fff'}
                />
                <Text style={[s.locationBtnText, location && s.locationBtnTextSet]}>
                  {location ? 'Location detected — tap to update' : 'Detect My Location'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {location && (
            <Text style={s.locationCoords}>
              {location.latitude.toFixed(5)}°N · {location.longitude.toFixed(5)}°E
            </Text>
          )}
        </View>

        {/* ── Description (optional) ── */}
        <View style={s.sectionBlock}>
          <View style={s.labelRow}>
            <Text style={s.sectionLabel}>More details</Text>
            <Text style={s.optionalTag}>optional</Text>
          </View>
          <TextInput
            style={s.textarea}
            placeholder="Anything else responders should know…"
            placeholderTextColor={t.muted}
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
            <Text style={s.sectionLabel}>Photo</Text>
            <Text style={s.optionalTag}>optional</Text>
          </View>
          <TouchableOpacity style={s.photoBtn} onPress={pickImage} activeOpacity={0.8}>
            <Ionicons name={imageUri ? 'camera' : 'camera-outline'} size={18} color={t.sectionTitle} />
            <Text style={s.photoBtnText}>{imageUri ? 'Change Photo' : 'Attach a Photo'}</Text>
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
              <Text style={s.submitText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
