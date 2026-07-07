const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "LendAHand-Web/1.0 (contact: s.nadishah@gmail.com)";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  if (!address || !address.trim()) return null;

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
    if (!results.length) return null;

    const { lat, lon } = results[0];
    return { lat: parseFloat(lat), lng: parseFloat(lon) };
  } catch {
    return null;
  }
}
