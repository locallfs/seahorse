import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  console.log("POST /api/quote-request — start");

  const privateKey = process.env.KLAVIYO_PRIVATE_KEY;

  if (!privateKey) {
    console.log("POST /api/quote-request — missing KLAVIYO_PRIVATE_KEY");
    return NextResponse.json(
      { error: "Quote requests are not configured" },
      { status: 500 }
    );
  }

  const { name, email, phone, service, size, message } = await req.json();

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    const profileRes = await fetch("https://a.klaviyo.com/api/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${privateKey}`,
        revision: "2024-10-15",
      },
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email,
            first_name: firstName,
            last_name: lastName || undefined,
            phone_number: phone || undefined,
            properties: {
              quote_service: service || "General Inquiry",
              quote_tank_size: size || "",
              quote_message: message || "",
            },
          },
        },
      }),
    });

    let profileId: string | null = null;

    if (profileRes.status === 409) {
      const dupData = await profileRes.json().catch(() => null);
      profileId = dupData?.errors?.[0]?.meta?.duplicate_profile_id ?? null;

      if (profileId) {
        await fetch(`https://a.klaviyo.com/api/profiles/${profileId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Klaviyo-API-Key ${privateKey}`,
            revision: "2024-10-15",
          },
          body: JSON.stringify({
            data: {
              type: "profile",
              id: profileId,
              attributes: {
                first_name: firstName,
                last_name: lastName || undefined,
                phone_number: phone || undefined,
                properties: {
                  quote_service: service || "General Inquiry",
                  quote_tank_size: size || "",
                  quote_message: message || "",
                },
              },
            },
          }),
        });
      }
    } else if (profileRes.ok) {
      const profileData = await profileRes.json().catch(() => null);
      profileId = profileData?.data?.id ?? null;
    } else {
      const text = await profileRes.text().catch(() => "");
      console.log(`POST /api/quote-request — profile error (${profileRes.status}): ${text}`);
    }

    const eventRes = await fetch("https://a.klaviyo.com/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Klaviyo-API-Key ${privateKey}`,
        revision: "2024-10-15",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            metric: {
              data: {
                type: "metric",
                attributes: {
                  name: "Quote Request",
                },
              },
            },
            profile: {
              data: {
                type: "profile",
                attributes: { email },
              },
            },
            properties: {
              service: service || "General Inquiry",
              tank_size: size || "Not specified",
              message: message || "No message",
              phone: phone || "Not provided",
              name,
            },
          },
        },
      }),
    });

    if (!eventRes.ok) {
      const text = await eventRes.text().catch(() => "");
      console.log(`POST /api/quote-request — event error (${eventRes.status}): ${text}`);
      return NextResponse.json({ error: "Failed to send request" }, { status: 502 });
    }

    console.log("POST /api/quote-request — success");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.log("POST /api/quote-request — error:", err);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
