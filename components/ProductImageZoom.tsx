"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface ProductImageZoomProps {
  src: string;
  alt: string;
}

const ZOOM_SCALE = 3.5;
const LENS_SIZE = 400;

export default function ProductImageZoom({ src, alt }: ProductImageZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLens, setShowLens] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full aspect-square rounded-xl border border-white/10 overflow-hidden relative bg-ocean-800 glow-white md:cursor-crosshair"
      onMouseEnter={() => setShowLens(true)}
      onMouseLeave={() => setShowLens(false)}
      onMouseMove={handleMouseMove}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 50vw"
        unoptimized
      />
      {showLens && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-white/70 shadow-2xl hidden md:block"
          style={{
            width: `${LENS_SIZE}px`,
            height: `${LENS_SIZE}px`,
            left: `calc(${pos.x}% - ${LENS_SIZE / 2}px)`,
            top: `calc(${pos.y}% - ${LENS_SIZE / 2}px)`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${ZOOM_SCALE * 100}%`,
            backgroundPosition: `${pos.x}% ${pos.y}%`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  );
}
