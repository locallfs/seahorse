import { NextResponse } from "next/server";

const PLACE_ID = process.env.GOOGLE_PLACE_ID;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET() {
  if (!PLACE_ID || !API_KEY) {
    return NextResponse.json({ reviews: [] });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const reviews = data?.result?.reviews ?? [];
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}
