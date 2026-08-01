'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { floatToTime, fmt12, timeToFloat } from '@/lib/time';

const PANEL_W = 240;

/**
 * A KEEP-styled 12-hour time popover. Renders as a button; the panel is
 * portalled to <body> so it escapes the scroll containers it is used inside.
 *
 * `value` is an "HH:MM" string (or null). `onChange` fires live while the user
 * steps; `onCommit` fires once the panel closes so callers can snapshot undo.
 */
export default function TimePicker({ value, onChange, onCommit, placeholder = 'Set time', className = '' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const repeat = useRef({ timeout: null, interval: null });

  useEffect(() => setMounted(true), []);

  const f = timeToFloat(value || '09:00');
  const h24 = Math.floor(f);
  const minutes = Math.round((f - h24) * 60);
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const emit = useCallback(
    (nh12, nm, nap) => {
      let h = nh12 % 12;
      if (nap === 'PM') h += 12;
      onChange(floatToTime(h + nm / 60));
    },
    [onChange]
  );

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const ph = panelRef.current?.offsetHeight || 300;
    let left = Math.min(Math.max(12, r.left), window.innerWidth - PANEL_W - 12);
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 8);
    setPos({ left, top });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    onCommit?.();
  }, [onCommit]);

  useEffect(() => {
    if (!open) return undefined;
    place();
    const onDocDown = (e) => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onEsc = (e) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDocDown);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onDocDown);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place, close]);

  const step = (unit, dir) => {
    if (unit === 'h') {
      let n = h12 + dir;
      if (n > 12) n = 1;
      if (n < 1) n = 12;
      emit(n, minutes, ap);
    } else {
      let n = minutes + dir * 5;
      if (n >= 60) n = 0;
      if (n < 0) n = 55;
      emit(h12, n, ap);
    }
  };

  const holdStart = (e, unit, dir) => {
    e.preventDefault();
    step(unit, dir);
    repeat.current.timeout = setTimeout(() => {
      repeat.current.interval = setInterval(() => step(unit, dir), 90);
    }, 380);
    const stop = () => {
      clearTimeout(repeat.current.timeout);
      clearInterval(repeat.current.interval);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointerup', stop);
  };

  useEffect(
    () => () => {
      clearTimeout(repeat.current.timeout);
      clearInterval(repeat.current.interval);
    },
    []
  );

  const setNow = () => {
    const n = new Date();
    const nap = n.getHours() >= 12 ? 'PM' : 'AM';
    const nh = n.getHours() % 12 === 0 ? 12 : n.getHours() % 12;
    emit(nh, (Math.round(n.getMinutes() / 5) * 5) % 60, nap);
  };

  const panel = (
    <div
      ref={panelRef}
      style={{ left: pos.left, top: pos.top, width: PANEL_W }}
      className="anim-pop fixed z-[60] rounded-pill border border-edge bg-[#141414] p-5 shadow-2xl"
    >
      <div className="mb-4 text-center text-[26px] font-bold tabular-nums tracking-tight text-white">
        {h12}:{String(minutes).padStart(2, '0')}
        <span className="ml-1 text-sm opacity-40">{ap}</span>
      </div>

      {[
        ['Hour', 'h', h12],
        ['Min', 'm', String(minutes).padStart(2, '0')],
      ].map(([label, unit, display]) => (
        <div key={unit} className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</span>
          <div className="flex items-center gap-2.5">
            <button type="button" className="step-btn" onPointerDown={(e) => holdStart(e, unit, -1)}>
              −
            </button>
            <span className="w-8 text-center text-lg font-bold tabular-nums text-white">{display}</span>
            <button type="button" className="step-btn" onPointerDown={(e) => holdStart(e, unit, 1)}>
              +
            </button>
          </div>
        </div>
      ))}

      <div className="mb-4 mt-4 flex rounded-full bg-[#0a0a0a] p-1">
        {['AM', 'PM'].map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => emit(h12, minutes, x)}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${
              ap === x ? 'bg-white text-black' : 'text-soft opacity-60'
            }`}
          >
            {x}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={setNow}
          className="flex-1 rounded-full border border-edge py-2.5 text-xs font-semibold text-soft transition-colors hover:border-white hover:text-white"
        >
          Now
        </button>
        <button
          type="button"
          onClick={close}
          className="flex-1 rounded-full bg-white py-2.5 text-xs font-bold text-black transition-colors hover:bg-neutral-200"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`time-btn ${open ? 'active' : ''} ${className}`}
        onClick={() => {
          if (!value) emit(h12, minutes, ap);
          setOpen((o) => !o);
        }}
      >
        {value ? fmt12(timeToFloat(value)) : placeholder}
      </button>
      {mounted && open ? createPortal(panel, document.body) : null}
    </>
  );
}
