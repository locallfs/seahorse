import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("POST /api/klaviyo-subscribe — start");

  const privateKey = process.env.KLAVIYO_PRIVATE_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;

  if (!privateKey || !listId) {
    console.log("POST /api/klaviyo-subscribe — missing env vars");
    return NextResponse.json(
      { error: "Email subscription is not configured" },
      { status: 500 }
    );
  }

  const { email, firstName, lastName } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Klaviyo-API-Key ${privateKey}`,
          revision: "2024-10-15",
        },
        body: JSON.stringify({
          data: {
            type: "profile-subscription-bulk-create-job",
            attributes: {
              custom_source: "Website Registration",
              profiles: {
                data: [
                  {
                    type: "profile",
                    attributes: {
                      email,
                      first_name: firstName || undefined,
                      last_name: lastName || undefined,
                      subscriptions: {
                        email: { marketing: { consent: "SUBSCRIBED" } },
                      },
                    },
                  },
                ],
              },
            },
            relationships: {
              list: {
                data: {
                  type: "list",
                  id: listId,
                },
              },
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log(`POST /api/klaviyo-subscribe — Klaviyo error (${res.status}): ${text}`);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 502 }
      );
    }

    console.log("POST /api/klaviyo-subscribe — success");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.log("POST /api/klaviyo-subscribe — error:", err);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
