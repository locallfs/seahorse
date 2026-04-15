"use client";

import { useEffect, useRef, useState } from "react";
import { cdn } from "@/lib/cdn";

export default function SplashScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  const dismiss = () => {
    setFading(true);
    sessionStorage.setItem("splash_shown", "1");
    document.documentElement.classList.remove("splash-active");
    setTimeout(() => setVisible(false), 700);
  };

  useEffect(() => {
    if (sessionStorage.getItem("splash_shown")) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      id="splash-screen"
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 700ms ease",
        cursor: "pointer",
      }}
    >
      <video
        ref={videoRef}
        src={cdn("/Seahorse Logo Splashing.mp4")}
        autoPlay
        muted
        playsInline
        onEnded={dismiss}
        onError={dismiss}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
