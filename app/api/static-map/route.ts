import { NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET() {
  if (!API_KEY) {
    return new NextResponse("Missing API key", { status: 500 });
  }

  const url = `https://maps.googleapis.com/maps/api/staticmap?center=45.5777433,-122.6648056&zoom=15&size=640x400&scale=2&maptype=roadmap&markers=color:red%7C45.5777433,-122.6648056&style=feature:all%7Celement:geometry%7Ccolor:0x1a1a2e&style=feature:all%7Celement:labels.text.fill%7Ccolor:0xffffff&style=feature:all%7Celement:labels.text.stroke%7Ccolor:0x000000&style=feature:water%7Celement:geometry%7Ccolor:0x000E54&style=feature:road%7Celement:geometry%7Ccolor:0x333355&key=${API_KEY}`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
