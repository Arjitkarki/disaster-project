/**
 * AppText — drop-in replacement for <Text>.
 *
 * When the app language is Nepali ('ne'), automatically maps fontWeight
 * to the correct Noto Sans Devanagari variant so Devanagari script
 * renders sharply with the right weight.  English text is unaffected.
 */
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

// Only 4 variants loaded in App.tsx to keep bundle size down.
// Weights not in this map fall back to the nearest loaded variant.
const WEIGHT_TO_FONT: Record<string, string> = {
  '100':    'NotoSansDevanagari_400Regular',
  '200':    'NotoSansDevanagari_400Regular',
  '300':    'NotoSansDevanagari_400Regular',
  '400':    'NotoSansDevanagari_400Regular',
  'normal': 'NotoSansDevanagari_400Regular',
  '500':    'NotoSansDevanagari_600SemiBold',
  '600':    'NotoSansDevanagari_600SemiBold',
  '700':    'NotoSansDevanagari_700Bold',
  'bold':   'NotoSansDevanagari_700Bold',
  '800':    'NotoSansDevanagari_800ExtraBold',
  '900':    'NotoSansDevanagari_800ExtraBold',
};

export function AppText({ style, ...props }: TextProps) {
  const { lang } = useLanguage();

  // English — render exactly as before, no font override.
  if (lang !== 'ne') {
    return <Text style={style} {...props} />;
  }

  // Nepali — pick the Devanagari variant that matches the requested weight.
  const flat = StyleSheet.flatten(style) ?? {};
  const weight = String(flat.fontWeight ?? '400');
  const fontFamily = WEIGHT_TO_FONT[weight] ?? 'NotoSansDevanagari_400Regular';

  // fontWeight must be cleared ('normal') so the OS doesn't apply
  // synthetic bold on top of an already-bold font file.
  return (
    <Text
      style={[style, { fontFamily, fontWeight: 'normal' }]}
      {...props}
    />
  );
}
