type Props = {
  amount: number | undefined | null;
  className?: string;
};

export default function FreeShippingBadge({ amount, className = "" }: Props) {
  if (typeof amount !== "number" || amount < 500) return null;
  return (
    <div
      className={`absolute top-2 right-2 z-10 px-2.5 py-1 rounded-md bg-[#FFD700] text-black text-[10px] font-bold tracking-wider uppercase shadow-lg ${className}`}
    >
      Free Shipping
    </div>
  );
}
