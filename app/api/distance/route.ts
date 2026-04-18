import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const STORE_LAT = 45.5777433;
const STORE_LNG = -122.6648056;

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: Request) {
  console.log("[api/distance] start");
  if (!API_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address,
  )}&key=${API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (!loc) {
      console.log("[api/distance] no geocode result");
      return NextResponse.json({ error: "Could not geocode address" }, { status: 404 });
    }
    const miles = haversineMiles(STORE_LAT, STORE_LNG, loc.lat, loc.lng);
    console.log(`[api/distance] end — ${miles.toFixed(1)} mi`);
    return NextResponse.json({ miles: Math.round(miles * 10) / 10 });
  } catch (e) {
    console.log("[api/distance] error", e);
    return NextResponse.json({ error: "Geocode failed" }, { status: 500 });
  }
}
