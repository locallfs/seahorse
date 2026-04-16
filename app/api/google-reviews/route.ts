import { NextResponse } from "next/server";

const PLACE_ID = process.env.GOOGLE_PLACE_ID;
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET() {
  if (!PLACE_ID || !API_KEY) {
    return NextResponse.json({ reviews: [], error: "Missing env vars", hasPlaceId: !!PLACE_ID, hasApiKey: !!API_KEY });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews&key=${API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    console.log("Google Places response:", JSON.stringify(data));
    const reviews = data?.result?.reviews ?? [];
    return NextResponse.json({ reviews, status: data?.status, error_message: data?.error_message });
  } catch (err) {
    return NextResponse.json({ reviews: [], error: String(err) });
  }
}
