const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "LendAHand-Web/1.0 (contact: s.nadishah@gmail.com)";

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Nominatim's usage policy allows at most ~1 request/second and asks that
// results be cached. We enforce both here so the public app can't get the
// shared IP rate-limited or banned: an in-memory cache for repeat lookups and
// a global queue that spaces live requests at least 1s apart.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 1100;
const cache = new Map<string, { value: GeoPoint | null; at: number }>();

let lastCall = 0;
let chain: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  const run = chain.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
  });
  chain = run.catch(() => undefined);
  return run;
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  if (!address || !address.trim()) return null;

  const key = address.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  await throttle();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", address);

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) {
      cache.set(key, { value: null, at: Date.now() });
      return null;
    }

    const { lat, lon } = results[0];
    const value = { lat: parseFloat(lat), lng: parseFloat(lon) };
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch {
    return null;
  }
}
