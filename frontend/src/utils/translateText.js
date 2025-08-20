const clientCache = new Map();

export async function translateText(text, target) {
  if (!text) return '';
  if (!target || target === 'en') return text;
  const key = `${target}:${text}`;
  if (clientCache.has(key)) return clientCache.get(key);
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target })
    });
    if (!res.ok) return text;
    const data = await res.json();
    const out = data.translatedText || text;
    clientCache.set(key, out);
    return out;
  } catch {
    return text;
  }
} 