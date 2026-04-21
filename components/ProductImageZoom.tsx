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
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [bgSize, setBgSize] = useState({ w: LENS_SIZE * ZOOM_SCALE, h: LENS_SIZE * ZOOM_SCALE });
  const [bgPosPx, setBgPosPx] = useState({ x: 0, y: 0 });
  const [imgAspect, setImgAspect] = useState(1);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setCursor({ x: cx, y: cy });

    const containerAspect = rect.width / rect.height;
    let imgW: number;
    let imgH: number;
    if (imgAspect >= containerAspect) {
      imgW = rect.width;
      imgH = rect.width / imgAspect;
    } else {
      imgH = rect.height;
      imgW = rect.height * imgAspect;
    }
    const offsetX = (rect.width - imgW) / 2;
    const offsetY = (rect.height - imgH) / 2;

    const fracX = Math.max(0, Math.min(1, (cx - offsetX) / imgW));
    const fracY = Math.max(0, Math.min(1, (cy - offsetY) / imgH));

    const bgW = imgW * ZOOM_SCALE;
    const bgH = imgH * ZOOM_SCALE;
    setBgSize({ w: bgW, h: bgH });
    setBgPosPx({
      x: LENS_SIZE / 2 - bgW * fracX,
      y: LENS_SIZE / 2 - bgH * fracY,
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full aspect-square rounded-xl border border-white/10 overflow-hidden relative bg-black glow-purple md:cursor-crosshair"
      onMouseEnter={() => setShowLens(true)}
      onMouseLeave={() => setShowLens(false)}
      onMouseMove={handleMouseMove}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        sizes="(max-width: 1024px) 100vw, 50vw"
        unoptimized
        onLoadingComplete={(img) => {
          if (img.naturalWidth && img.naturalHeight) {
            setImgAspect(img.naturalWidth / img.naturalHeight);
          }
        }}
      />
      {showLens && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-white/70 shadow-2xl hidden md:block bg-black"
          style={{
            width: `${LENS_SIZE}px`,
            height: `${LENS_SIZE}px`,
            left: `${cursor.x - LENS_SIZE / 2}px`,
            top: `${cursor.y - LENS_SIZE / 2}px`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${bgSize.w}px ${bgSize.h}px`,
            backgroundPosition: `${bgPosPx.x}px ${bgPosPx.y}px`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  );
}
