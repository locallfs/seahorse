"use client";

import { useEffect, useState } from "react";
import {
  useShippingConditions,
  type ShippingConditions,
} from "@/components/ShippingConditionsContext";

/**
 * Live shipping conditions for the visitor's area, or for a specific
 * destination once a postal code is known.
 *
 * The visitor's location is resolved once on site load by
 * ShippingConditionsProvider, so this component normally just reads it — no
 * request of its own, no permission prompt, no loading flicker. Passing a
 * postalCode asks for that destination instead.
 *
 * Renders nothing until it has something useful to say, so it can never leave
 * an empty box in the layout.
 */

const DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  caution: "bg-amber-400",
  hold: "bg-rose-400",
};

const RING: Record<string, string> = {
  ok: "border-emerald-400/30",
  caution: "border-amber-400/40",
  hold: "border-rose-400/50",
};

type Props = {
  /** Destination postal code, when the customer has given one. */
  postalCode?: string | null;
  className?: string;
};

export default function LiveShippingConditions({ postalCode, className }: Props) {
  const { conditions: visitorConditions, forPostalCode } = useShippingConditions();
  // Stored with the postal code it belongs to, so a result for a previous
  // address can never be shown against a new one — and so the effect never
  // has to clear state synchronously just to invalidate it.
  const [destination, setDestination] = useState<{
    zip: string;
    data: ShippingConditions | null;
  } | null>(null);

  const zip = postalCode?.trim().slice(0, 5) ?? "";
  const wantsDestination = /^\d{5}$/.test(zip);

  useEffect(() => {
    if (!wantsDestination) return;
    let cancelled = false;
    forPostalCode(zip).then((result) => {
      if (!cancelled) setDestination({ zip, data: result });
    });
    return () => {
      cancelled = true;
    };
  }, [zip, wantsDestination, forPostalCode]);

  // A known destination beats the visitor's own location — that is where the
  // animals are actually going.
  const destinationData =
    wantsDestination && destination?.zip === zip ? destination.data : null;
  const data = destinationData ?? visitorConditions;

  if (!data?.available) return null;

  const severity = data.severity ?? "ok";

  return (
    <div
      className={`mt-4 rounded-lg border bg-black/25 px-4 py-3 transition-opacity duration-500 ${
        RING[severity] ?? RING.ok
      } ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[severity] ?? DOT.ok}`}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {data.headline}
            {data.location?.label ? (
              <span className="ml-2 font-normal text-white/50">
                {data.location.label}
                {typeof data.currentF === "number" ? ` · ${data.currentF}°F now` : ""}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">{data.detail}</p>
          {data.nextShipDay ? (
            <p className="mt-1.5 text-xs text-white/50">
              {data.shipsToday
                ? "Live orders ship today."
                : `Next live shipping day: ${data.nextShipDay}.`}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
