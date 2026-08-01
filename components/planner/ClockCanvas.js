'use client';

import { useEffect, useRef } from 'react';
import { computeConflicts } from '@/lib/blocks';
import { circDist, durationOf, floatToTime, fmt12, fmtDur, inSpan, snap, timeToFloat } from '@/lib/time';

const SIZE = 1600;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 750;
const BEZEL = 110;
const SLICE_R = R - BEZEL;

// KEEP surface palette, drawn straight onto the canvas.
const FACE = '#111111';
const STROKE = '#f5f5f5';
const SOFT = 'rgba(245,245,245,0.42)';
const FAINT = 'rgba(245,245,245,0.075)';
const HANDLE = '#ffffff';

const angleOfHour = (h) => (h / 24) * 2 * Math.PI - Math.PI / 2;

function contrastText(hex) {
  const h = String(hex || '#8f8f8f').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 140 ? '#0a0a0a' : '#ffffff';
}

/**
 * The 24-hour face. Blocks are dragged whole or resized by either edge; every
 * change is reported up as `{ start, end }` so the caller decides whether it
 * belongs to a planner activity or a board card.
 */
export default function ClockCanvas({ blocks, selectedKey, onSelect, onChange, onCommit, canvasRef }) {
  const innerRef = useRef(null);
  const ref = canvasRef || innerRef;

  // Pointer handlers are bound once, so they read live props through this ref.
  const live = useRef({ blocks, selectedKey, onSelect, onChange, onCommit });
  live.current = { blocks, selectedKey, onSelect, onChange, onCommit };

  const drag = useRef(null);
  const hover = useRef(null);
  const dragPos = useRef(null);

  const draw = useRef(() => {});
  draw.current = () => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { blocks: bs, selectedKey: sel } = live.current;
    const conflicts = computeConflicts(bs);

    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, 2 * Math.PI);
    ctx.fillStyle = FACE;
    ctx.fill();

    // Faint hour spokes, kept off the middle so the centre stays clean.
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const a = angleOfHour(i);
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * SLICE_R * 0.55, CY + Math.sin(a) * SLICE_R * 0.55);
      ctx.lineTo(CX + Math.cos(a) * SLICE_R, CY + Math.sin(a) * SLICE_R);
      ctx.stroke();
    }

    const slicePath = (s, d) => {
      const a0 = angleOfHour(s);
      const a1 = a0 + (d / 24) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, SLICE_R, a0, a1);
      ctx.closePath();
      return [a0, a1];
    };

    bs.forEach((b, i) => {
      const s = timeToFloat(b.start);
      const d = durationOf(b);
      const [a0, a1] = slicePath(s, d);

      ctx.fillStyle = b.color || '#8f8f8f';
      ctx.fill();
      ctx.strokeStyle = FACE;
      ctx.lineWidth = 7;
      ctx.stroke();

      if (conflicts.has(i)) {
        ctx.save();
        slicePath(s, d);
        ctx.clip();
        ctx.strokeStyle = contrastText(b.color) === '#ffffff' ? 'rgba(255,255,255,0.35)' : 'rgba(10,10,10,0.3)';
        ctx.lineWidth = 5;
        for (let x = -SIZE; x < SIZE * 2; x += 42) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + SIZE, SIZE);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (sel === b.key) {
        slicePath(s, d);
        ctx.strokeStyle = HANDLE;
        ctx.lineWidth = 10;
        ctx.stroke();
      }

      // Label, rotated to stay upright around the dial.
      const mid = a0 + (a1 - a0) / 2;
      const dist = SLICE_R * 0.62;
      ctx.save();
      ctx.translate(CX + Math.cos(mid) * dist, CY + Math.sin(mid) * dist);
      let rot = mid;
      const norm = ((rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (norm > Math.PI / 2 && norm < (3 * Math.PI) / 2) rot += Math.PI;
      ctx.rotate(rot);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = contrastText(b.color);
      const label = b.label || 'Untitled';
      if (d >= 1.2) {
        ctx.font = '700 42px Inter, sans-serif';
        ctx.fillText(label, 0, -18);
        ctx.globalAlpha = 0.6;
        ctx.font = '500 28px Inter, sans-serif';
        ctx.fillText(`${fmtDur(d)}${b.source === 'board' ? ' · board' : ''}`, 0, 28);
        ctx.globalAlpha = 1;
      } else if (d >= 0.5) {
        ctx.font = '700 32px Inter, sans-serif';
        ctx.fillText(label, 0, 0);
      }
      ctx.restore();
    });

    // Edge handle for whatever is being dragged or hovered.
    const focus = drag.current || hover.current;
    if (focus && focus.mode !== 'move') {
      const b = bs.find((x) => x.key === focus.key);
      if (b) {
        const h = focus.mode === 'start' ? timeToFloat(b.start) : timeToFloat(b.start) + durationOf(b);
        const a = angleOfHour(h);
        const hx = CX + Math.cos(a) * (SLICE_R * 0.62);
        const hy = CY + Math.sin(a) * (SLICE_R * 0.62);
        ctx.beginPath();
        ctx.arc(hx, hy, 24, 0, 2 * Math.PI);
        ctx.fillStyle = FACE;
        ctx.fill();
        ctx.lineWidth = 7;
        ctx.strokeStyle = HANDLE;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, 2 * Math.PI);
        ctx.fillStyle = HANDLE;
        ctx.fill();
      }
    }

    // Rings.
    ctx.beginPath();
    ctx.arc(CX, CY, SLICE_R, 0, 2 * Math.PI);
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, 2 * Math.PI);
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Ticks and the 24 hour numerals.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 24; i++) {
      const a = angleOfHour(i);
      const major = i % 3 === 0;
      ctx.beginPath();
      ctx.lineWidth = major ? 5 : 2.5;
      const len = major ? 26 : 14;
      ctx.moveTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R);
      ctx.lineTo(CX + Math.cos(a) * (R - len), CY + Math.sin(a) * (R - len));
      ctx.strokeStyle = major ? STROKE : SOFT;
      ctx.stroke();

      const nd = R - BEZEL / 2 - 7;
      ctx.fillStyle = major ? STROKE : SOFT;
      ctx.font = `${major ? '700' : '600'} ${major ? 30 : 24}px Inter, sans-serif`;
      ctx.fillText(i === 0 ? '24' : String(i), CX + Math.cos(a) * nd, CY + Math.sin(a) * nd);
    }

    // Drag readout.
    if (drag.current && dragPos.current) {
      const b = bs.find((x) => x.key === drag.current.key);
      if (b) {
        const text = `${fmt12(timeToFloat(b.start))} – ${fmt12(timeToFloat(b.end))} · ${fmtDur(durationOf(b))}`;
        ctx.font = '700 30px Inter, sans-serif';
        const w = ctx.measureText(text).width + 52;
        const h = 62;
        let x = Math.max(20, Math.min(SIZE - w - 20, dragPos.current.x - w / 2));
        let y = Math.max(20, dragPos.current.y - 104);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, 31);
        else ctx.rect(x, y, w, h);
        ctx.fillStyle = STROKE;
        ctx.fill();
        ctx.fillStyle = '#0a0a0a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2 + 1);
      }
    }
  };

  useEffect(() => {
    draw.current();
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;

    const pointerInfo = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (SIZE / rect.width);
      const y = (e.clientY - rect.top) * (SIZE / rect.height);
      const dx = x - CX;
      const dy = y - CY;
      let ang = Math.atan2(dy, dx) + Math.PI / 2;
      if (ang < 0) ang += 2 * Math.PI;
      return { hour: (ang / (2 * Math.PI)) * 24, dist: Math.hypot(dx, dy), x, y };
    };

    const hitTest = (hour, dist) => {
      if (dist < 40 || dist > SLICE_R + 30) return null;
      const EDGE = 0.45;
      const bs = live.current.blocks;
      let best = null;
      bs.forEach((b) => {
        const s = timeToFloat(b.start);
        const e = (s + durationOf(b)) % 24;
        const ds = circDist(hour, s);
        const de = circDist(hour, e);
        if (ds < EDGE && (!best || ds < best.d)) best = { key: b.key, mode: 'start', d: ds };
        if (de < EDGE && (!best || de < best.d)) best = { key: b.key, mode: 'end', d: de };
      });
      if (best) return best;
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        if (inSpan(hour, timeToFloat(b.start), durationOf(b))) return { key: b.key, mode: 'move', d: 0 };
      }
      return null;
    };

    const onDown = (e) => {
      const { hour, dist, x, y } = pointerInfo(e);
      const hit = hitTest(hour, dist);
      if (!hit) {
        live.current.onSelect(null);
        drag.current = null;
        draw.current();
        return;
      }
      const b = live.current.blocks.find((x2) => x2.key === hit.key);
      drag.current = { ...hit, grabOffset: (((hour - timeToFloat(b.start)) % 24) + 24) % 24, moved: false };
      dragPos.current = { x, y };
      live.current.onSelect(hit.key);
      canvas.setPointerCapture(e.pointerId);
      draw.current();
    };

    const onMove = (e) => {
      const { hour, dist, x, y } = pointerInfo(e);

      if (!drag.current) {
        const hit = hitTest(hour, dist);
        const changed = JSON.stringify(hit) !== JSON.stringify(hover.current);
        hover.current = hit;
        canvas.style.cursor = hit ? (hit.mode === 'move' ? 'grab' : 'ew-resize') : 'default';
        if (changed) draw.current();
        return;
      }

      dragPos.current = { x, y };
      const b = live.current.blocks.find((x2) => x2.key === drag.current.key);
      if (!b) return;
      const s = timeToFloat(b.start);
      const d = durationOf(b);

      if (drag.current.mode === 'move') {
        const ns = snap(hour - drag.current.grabOffset);
        if (floatToTime(ns) === b.start) return;
        drag.current.moved = true;
        live.current.onChange(b.key, { start: floatToTime(ns), end: floatToTime(ns + d) });
      } else if (drag.current.mode === 'start') {
        const ns = snap(hour);
        const nd = (((timeToFloat(b.end) - ns) % 24) + 24) % 24;
        if (nd < 0.25 || nd > 23.75) return;
        if (floatToTime(ns) === b.start) return;
        drag.current.moved = true;
        live.current.onChange(b.key, { start: floatToTime(ns) });
      } else {
        const ne = snap(hour);
        const nd = (((ne - s) % 24) + 24) % 24;
        if (nd < 0.25 || nd > 23.75) return;
        if (floatToTime(ne) === b.end) return;
        drag.current.moved = true;
        live.current.onChange(b.key, { end: floatToTime(ne) });
      }
    };

    const endDrag = () => {
      if (!drag.current) return;
      const moved = drag.current.moved;
      drag.current = null;
      dragPos.current = null;
      if (moved) live.current.onCommit?.();
      draw.current();
    };

    const onLeave = () => {
      if (!drag.current && hover.current) {
        hover.current = null;
        canvas.style.cursor = 'default';
        draw.current();
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [ref]);

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      style={{ touchAction: 'none' }}
      // The dial is square and sized by the *shorter* axis, so it is bounded by
      // the panel's height first and only clipped by width on narrow screens.
      // Keeping the element itself square is also what makes pointer -> hour
      // mapping in pointerInfo() correct.
      className="block h-auto max-h-full w-auto max-w-full"
    />
  );
}
