"use client";

import { useMemo } from "react";
import QRCode from "qrcode";

/**
 * QR-Code als reines SVG. Immer schwarz auf weiss mit Ruhezone —
 * auch im dunklen Design, sonst scannen manche Kameras nicht.
 */
export function QrCode({
  text,
  className = "",
  label,
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const { groesse, pfad } = useMemo(() => {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    let d = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.modules.data[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { groesse: n, pfad: d };
  }, [text]);

  const rand = 3;
  return (
    <svg
      viewBox={`${-rand} ${-rand} ${groesse + 2 * rand} ${groesse + 2 * rand}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label ?? "QR-Code"}
      className={className}
    >
      <rect
        x={-rand}
        y={-rand}
        width={groesse + 2 * rand}
        height={groesse + 2 * rand}
        fill="#fff"
      />
      <path d={pfad} fill="#000" />
    </svg>
  );
}
