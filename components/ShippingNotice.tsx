type Props = {
  hasLive: boolean;
  className?: string;
};

export default function ShippingNotice({ hasLive, className }: Props) {
  return (
    <div
      className={`rounded-xl border-2 p-5 bg-ocean-900/70 ${className ?? ""}`}
      style={{
        borderColor: "#FFD700",
        boxShadow:
          "0 0 22px rgba(255, 255, 255, 0.45), 0 4px 14px rgba(0, 0, 0, 0.3)",
      }}
    >
      {hasLive ? (
        <>
          <p
            className="text-base md:text-lg font-bold tracking-wide mb-1"
            style={{ color: "#FFD700" }}
          >
            Live Animal Shipping — Overnight Shipping REQUIRED!
          </p>
          <p className="text-white/85 text-sm leading-relaxed">
            Local Pickup available at checkout if within 100 miles of our Portland store.
          </p>
        </>
      ) : (
        <>
          <p
            className="text-base md:text-lg font-bold tracking-wide mb-1"
            style={{ color: "#FFD700" }}
          >
            Local Pickup Available
          </p>
          <p className="text-white/85 text-sm leading-relaxed">
            Free local pickup at checkout if within 100 miles of our Portland store.
          </p>
        </>
      )}
    </div>
  );
}
