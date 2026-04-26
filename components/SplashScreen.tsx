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
    const force =
      typeof window !== "undefined" &&
      window.location.search.includes("splash=1");
    if (!force && sessionStorage.getItem("splash_shown")) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      v.play().catch((err) => {
        console.warn("[splash] autoplay blocked:", err?.message || err);
      });
    };
    tryPlay();
  }, [visible]);

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
        preload="auto"
        onEnded={dismiss}
        onError={(e) => {
          console.warn("[splash] video error", e);
          dismiss();
        }}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Skip intro"
        style={{
          position: "absolute",
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
          padding: "0.6rem 1.1rem",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          borderRadius: "9999px",
          color: "white",
          fontSize: "0.75rem",
          fontWeight: 500,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          transition: "background 200ms ease, border-color 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
        }}
      >
        Skip ›
      </button>
    </div>
  );
}
