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

    const [relevantRes, newestRes] = await Promise.all([
      fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&reviews_sort=most_relevant&key=${API_KEY}`,
        { next: { revalidate: 3600 } }
      ),
      fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&reviews_sort=newest&key=${API_KEY}`,
        { next: { revalidate: 3600 } }
      ),
    ]);

    const relevantData = await relevantRes.json();
    const newestData = await newestRes.json();

    const relevant = relevantData?.result?.reviews ?? [];
    const newest = newestData?.result?.reviews ?? [];

    const seen = new Set<string>();
    const combined = [];
    for (const review of [...relevant, ...newest]) {
      if (!seen.has(review.author_name)) {
        seen.add(review.author_name);
        combined.push(review);
      }
    }

    return NextResponse.json({ reviews: combined });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}
