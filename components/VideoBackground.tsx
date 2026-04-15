"use client";

import { useRef, useEffect } from "react";
import { cdn } from "@/lib/cdn";

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className="fixed inset-0 -z-10">
      <video
        ref={videoRef}
        src={cdn("/videos/seedance2_Video_saltwater.mp4")}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}
