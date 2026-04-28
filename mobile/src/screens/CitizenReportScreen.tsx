import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../constants/api';

export default function CitizenReportScreen() {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const detectLocation = async () => {
    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is needed to pin your report.');
      setLocating(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    setLocating(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Photo access is needed to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert('Description required', 'Please describe what you observed.');
      return;
    }
    if (!location) {
      Alert.alert('Location required', 'Tap "Detect My Location" before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, ...location }),
      });
      if (res.ok) {
        Alert.alert('Submitted', 'Your report has been received. Thank you.');
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

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Report an Incident</Text>
        <Text style={s.subheading}>Your report helps responders act faster.</Text>

        <Text style={s.label}>What happened? *</Text>
        <TextInput
          style={s.textarea}
          placeholder="Describe what you saw..."
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        <Text style={s.label}>Location *</Text>
        <TouchableOpacity style={s.locationBtn} onPress={detectLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.locationBtnText}>
              {location
                ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : 'Detect My Location'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={s.label}>Photo (optional)</Text>
        <TouchableOpacity style={s.photoBtn} onPress={pickImage}>
          <Text style={s.photoBtnText}>{imageUri ? 'Change Photo' : 'Attach Photo'}</Text>
        </TouchableOpacity>
        {imageUri && <Image source={{ uri: imageUri }} style={s.preview} />}

        <TouchableOpacity style={s.submitBtn} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F9FAFB' },
  inner:          { padding: 16, paddingBottom: 40 },
  heading:        { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subheading:     { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  label:          { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textarea: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14,
    minHeight: 100, marginBottom: 16,
  },
  locationBtn: {
    backgroundColor: '#2563EB', borderRadius: 8, padding: 14,
    alignItems: 'center', marginBottom: 16,
  },
  locationBtnText:{ color: '#fff', fontWeight: '600', fontSize: 14 },
  photoBtn: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', marginBottom: 12,
  },
  photoBtnText:   { color: '#374151', fontWeight: '600', fontSize: 14 },
  preview:        { width: '100%', height: 180, borderRadius: 8, marginBottom: 16 },
  submitBtn: {
    backgroundColor: '#DC2626', borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  submitText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
});
