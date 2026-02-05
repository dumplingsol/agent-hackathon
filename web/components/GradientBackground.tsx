'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function hexToRgba(hex: string, a = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function blendHex(a: string, b: string, t: number) {
  const ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
  const br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
  const r = Math.round(lerp(ar,br,t)).toString(16).padStart(2,'0');
  const g = Math.round(lerp(ag,bg,t)).toString(16).padStart(2,'0');
  const bl = Math.round(lerp(ab,bb,t)).toString(16).padStart(2,'0');
  return `#${r}${g}${bl}`;
}

function drawSmoothCurve(ctx: CanvasRenderingContext2D, pts: {x: number, y: number}[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(pts.length - 1, i + 1)];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const tension = 0.35;
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * tension, p1.y + (p2.y - p0.y) * tension,
      p2.x - (p3.x - p1.x) * tension, p2.y - (p3.y - p1.y) * tension,
      p2.x, p2.y
    );
  }
}

function generateRibbon(
  W: number, H: number, seed: number, yCenter: number, angle: number, 
  bend: number, motionAmt: number, time: number, flowSpeed: number
) {
  const numPts = 10;
  const pts = [];
  const angleRad = (angle * Math.PI) / 180;
  const t = time * flowSpeed * 0.008;
  const s = seed * 7.31;

  for (let i = 0; i < numPts; i++) {
    const frac = i / (numPts - 1);
    const baseX = -W * 0.08 + frac * W * 1.16;
    const baseY = H * yCenter + (frac - 0.5) * Math.tan(angleRad) * W * 0.5;

    const wave1 = Math.sin(frac * Math.PI * 2.0 + s + t * 0.7) * bend * H * 0.18;
    const wave2 = Math.sin(frac * Math.PI * 3.5 + s * 1.7 + t * 0.5) * bend * H * 0.08;
    const wave3 = Math.cos(frac * Math.PI * 1.2 + s * 0.6 + t * 0.9) * bend * H * 0.06;

    const motion1 = Math.sin(frac * Math.PI * 2.2 + t * 1.1 + s) * motionAmt * H * 0.04;
    const motion2 = Math.cos(frac * Math.PI * 1.5 + t * 0.8 + s * 2.1) * motionAmt * H * 0.025;

    const displaceY = wave1 + wave2 + wave3 + motion1 + motion2;
    const displaceX = Math.sin(frac * Math.PI * 1.8 + t * 0.6 + s * 0.9) * motionAmt * W * 0.008;

    pts.push({ x: baseX + displaceX, y: baseY + displaceY });
  }
  return pts;
}

export function GradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const timeRef = useRef(0);
  const { theme, systemTheme } = useTheme();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const isDark = currentTheme === 'dark';

    // Theme-aware colors: Purple → Blue → Cyan gradient
    const colors = isDark 
      ? ['#9945FF', '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9', '#06B6D4', '#00E5FF'] // Purple→Blue→Cyan
      : ['#9945FF', '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9', '#06B6D4', '#00E5FF']; // Same for light

    // Settings from user
    const strandCount = 110;
    const lineWidth = 2.5;
    const spread = 400;
    const opacity = 0.9;
    const flowSpeed = 0.6;
    const ribbons = [{
      yCenter: 0.4,
      angle: -15,
      bend: 0,
      motion: 0.3,
      colorShift: 0.3
    }];

    const W = canvas.width;
    const H = canvas.height;
    const t = timeRef.current;

    // Clear canvas properly (fillRect with transparent doesn't actually clear!)
    ctx.clearRect(0, 0, W, H);
    
    // Dark mode background
    if (isDark) {
      ctx.fillStyle = '#0d1225';
      ctx.fillRect(0, 0, W, H);
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let r = 0; r < ribbons.length; r++) {
      const rb = ribbons[r];
      const basePts = generateRibbon(W, H, r + 0.1, rb.yCenter, rb.angle, rb.bend, rb.motion, t, flowSpeed);

      for (let s = 0; s < strandCount; s++) {
        const strandT = (s / (strandCount - 1)) - 0.5;
        const offsetMag = strandT * spread;

        const offsetPts = basePts.map((pt, i) => {
          const next = basePts[Math.min(basePts.length - 1, i + 1)];
          const prev = basePts[Math.max(0, i - 1)];
          const tx = next.x - prev.x;
          const ty = next.y - prev.y;
          const len = Math.sqrt(tx * tx + ty * ty) || 1;
          const nx = -ty / len;
          const ny = tx / len;
          const wave = Math.sin(strandT * 15 + i * 1.2 + t * flowSpeed * 0.01) * spread * 0.03;
          return {
            x: pt.x + nx * (offsetMag + wave),
            y: pt.y + ny * (offsetMag + wave)
          };
        });

        const ct = (Math.abs(strandT) * 2 * 0.7 + rb.colorShift) % 1;
        const ci = ct * (colors.length - 1);
        const ci0 = Math.floor(ci);
        const ci1 = Math.min(colors.length - 1, ci0 + 1);
        const strandColor = blendHex(colors[ci0], colors[ci1], ci - ci0);

        const edgeFade = 1 - Math.pow(Math.abs(strandT) * 2, 2.0);
        const alpha = clamp(opacity * edgeFade, 0, 1);
        if (alpha < 0.01) continue;

        ctx.strokeStyle = hexToRgba(strandColor, alpha);
        ctx.lineWidth = lineWidth;
        ctx.globalCompositeOperation = isDark ? 'screen' : 'darken';

        drawSmoothCurve(ctx, offsetPts);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    timeRef.current += 1;
    rafRef.current = requestAnimationFrame(draw);
  }, [theme, systemTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas 
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}
