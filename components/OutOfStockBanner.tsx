type Props = {
  size?: "sm" | "md";
};

export default function OutOfStockBanner({ size = "md" }: Props) {
  const isSmall = size === "sm";
  const boxSize = isSmall ? "w-24 h-24" : "w-28 h-28 md:w-32 md:h-32";
  const ribbonOffset = isSmall ? "30%" : "32%";
  const fontSize = isSmall ? "text-[9px]" : "text-[11px]";
  return (
    <div
      className={`pointer-events-none absolute top-0 right-0 ${boxSize} overflow-hidden z-10`}
      aria-hidden="true"
    >
      <div
        className={`absolute bg-red-600 text-white font-bold uppercase tracking-wider text-center shadow-lg border-y border-white/40 py-1 ${fontSize}`}
        style={{
          width: "150%",
          right: "-25%",
          top: ribbonOffset,
          transform: "rotate(45deg)",
          transformOrigin: "center",
        }}
      >
        Out of Stock
      </div>
    </div>
  );
}
