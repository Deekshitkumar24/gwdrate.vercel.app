"use client";

import React, { useEffect, useState } from "react";
import DyeWhorl from "@/components/ui/dye-whorl";

interface DyeBackgroundProps {
  paused?: boolean;
  interactive?: boolean | "global";
  mode?: "fixed" | "cover";
  density?: number;
  speed?: number;
  children?: React.ReactNode;
  className?: string;
}

export default function DyeBackground({
  paused = false,
  interactive = true,
  mode = "fixed",
  density = 0.55,
  speed = 0.85,
  children,
  className = "",
}: DyeBackgroundProps) {
  const [hasWebGL2, setHasWebGL2] = useState<boolean | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check WebGL2 support
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      const ext =
        gl &&
        (gl.getExtension("EXT_color_buffer_float") ||
          gl.getExtension("EXT_color_buffer_half_float"));
      setHasWebGL2(Boolean(gl && ext));
    } catch {
      setHasWebGL2(false);
    }

    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  if (hasWebGL2 === false) {
    return (
      <>
        <div
          className="fixed inset-0 z-0 dye-fallback pointer-events-none"
          aria-hidden="true"
        />
        {children}
      </>
    );
  }

  const isPaused = paused || prefersReducedMotion;

  const fixedStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
  };

  // Uses globalTracking so cursor stirs fluid without ever obstructing DOM inputs, clicks or scrolling
  return (
    <>
      <DyeWhorl
        className={`dye-red ${className}`}
        style={fixedStyle}
        paused={isPaused}
        interactive={interactive ? "global" : false}
        globalTracking={Boolean(interactive && !isPaused)}
        density={density}
        speed={speed}
        theme="dark"
        background="#0b0507"
      />
      {children}
    </>
  );
}
