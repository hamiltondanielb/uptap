"use client";

import { useState } from "react";
import Image from "next/image";

const PREVIEW_W = 200;
const PREVIEW_H = 280;
const OFFSET_X = 16;
const OFFSET_Y = -40;

export function CardImagePreview({
  imageUrl,
  name,
  children
}: {
  imageUrl: string | null;
  name: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  if (!imageUrl) return <>{children}</>;

  function handleMouseMove(e: React.MouseEvent) {
    let x = e.clientX + OFFSET_X;
    let y = e.clientY + OFFSET_Y;
    // Keep within viewport
    if (x + PREVIEW_W > window.innerWidth - 8) x = e.clientX - PREVIEW_W - OFFSET_X;
    if (y + PREVIEW_H > window.innerHeight - 8) y = window.innerHeight - PREVIEW_H - 8;
    if (y < 8) y = 8;
    setPos({ x, y });
  }

  function handleMouseLeave() {
    setPos(null);
  }

  return (
    <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="contents">
      {children}
      {pos ? (
        <div
          className="pointer-events-none fixed z-[200]"
          style={{ left: pos.x, top: pos.y, width: PREVIEW_W, height: PREVIEW_H }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
            <Image alt={name} className="object-cover object-top" fill sizes="200px" src={imageUrl} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
