import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_QUERY = process.env.GOOGLE_PLACE_QUERY || "Woody's Seahorse Aquarium & Supply Portland OR";

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ reviews: [], error: "Missing API key" });
  }

  try {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(PLACE_QUERY)}&inputtype=textquery&fields=place_id&key=${API_KEY}`;
    const findRes = await fetch(findUrl, { cache: "no-store" });
    const findData = await findRes.json();
    const placeId = findData?.candidates?.[0]?.place_id;

    if (!placeId) {
      return NextResponse.json({ reviews: [], error: "Place not found", findData });
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${API_KEY}`;
    const detailsRes = await fetch(detailsUrl, { cache: "no-store" });
    const detailsData = await detailsRes.json();
    const reviews = detailsData?.result?.reviews ?? [];

    return NextResponse.json({ reviews });
  } catch (err) {
    return NextResponse.json({ reviews: [], error: String(err) });
  }
}
