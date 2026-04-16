import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_QUERY = process.env.GOOGLE_PLACE_QUERY || "Woody's Seahorse Aquarium & Supply Portland OR";

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ reviews: [] });
  }

  try {
    const findRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(PLACE_QUERY)}&inputtype=textquery&fields=place_id&key=${API_KEY}`,
      { next: { revalidate: 86400 } }
    );
    const findData = await findRes.json();
    const placeId = findData?.candidates?.[0]?.place_id;
    if (!placeId) return NextResponse.json({ reviews: [] });

    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const detailsData = await detailsRes.json();
    return NextResponse.json({ reviews: detailsData?.result?.reviews ?? [] });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}
