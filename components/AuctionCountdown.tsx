"use client";

import { useEffect, useState } from "react";

interface AuctionCountdownProps {
  startsAt: string;
  endsAt: string;
  status: string;
  compact?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function breakdown(ms: number) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

export default function AuctionCountdown({
  startsAt,
  endsAt,
  status,
  compact = false,
}: AuctionCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const beforeStart = now < startMs;
  const target = beforeStart ? startMs : endMs;
  const remaining = target - now;

  if (status === "ended" || (!beforeStart && remaining <= 0)) {
    return (
      <span className={compact ? "text-xs text-white/60" : "text-sm text-white/60"}>
        Ended
      </span>
    );
  }

  const { days, hours, minutes, seconds } = breakdown(remaining);
  const urgent = !beforeStart && remaining <= 2 * 60 * 1000;

  const label = beforeStart ? "Starts in" : "Ends in";
  const value = days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
    : hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  if (compact) {
    return (
      <div className="text-right">
        <p className="text-white/50 text-[10px] tracking-wider uppercase">
          {label}
        </p>
        <p
          className={`font-semibold tabular-nums ${
            urgent ? "text-red-300" : "text-white"
          }`}
        >
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/15 bg-ocean-900 px-5 py-4 inline-flex flex-col">
      <p className="text-xs tracking-[0.2em] uppercase text-white/60 mb-1">
        {label}
      </p>
      <p
        className={`text-3xl md:text-4xl font-bold tabular-nums ${
          urgent ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
