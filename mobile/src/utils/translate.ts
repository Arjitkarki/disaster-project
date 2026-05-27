const cache = new Map<string, string>();

export async function translateToNepali(text: string): Promise<string> {
  if (!text.trim()) return text;
  if (cache.has(text)) return cache.get(text)!;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ne`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    const translated = json?.responseData?.translatedText as string | undefined;
    if (translated && translated !== text) {
      cache.set(text, translated);
      return translated;
    }
  } catch {
    // Fall back to original on network error or timeout
  }
  return text;
}

export function clearTranslationCache() {
  cache.clear();
}
