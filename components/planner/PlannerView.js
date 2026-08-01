'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useVault } from '@/app/providers';
import { PageHeader } from '@/components/AppShell';
import TimePicker from '@/components/TimePicker';
import ClockCanvas from './ClockCanvas';
import { PRIORITY_META, SHADE_PRESETS, buildBlocks, computeConflicts, computeFreeGaps, parseKey } from '@/lib/blocks';
import { SNAP, durationOf, floatToTime, fmtDur, snap, timeToFloat } from '@/lib/time';

const DEFAULT_DAY = [
  { id: 'a1', start: '22:00', end: '06:30', color: '#333333', label: 'Sleep' },
  { id: 'a2', start: '07:00', end: '08:00', color: '#616161', label: 'Gym' },
  { id: 'a3', start: '09:00', end: '12:30', color: '#f5f5f5', label: 'Deep work' },
  { id: 'a4', start: '13:00', end: '14:00', color: '#a3a3a3', label: 'Lunch' },
];

const HISTORY_LIMIT = 60;
const HISTORY_IDLE_MS = 450;

export default function PlannerView() {
  const { activities, setActivities, tasks, setTasks, setVault } = useVault();
  const [selectedKey, setSelectedKey] = useState(null);
  const canvasRef = useRef(null);

  const blocks = useMemo(() => buildBlocks(activities, tasks), [activities, tasks]);
  const conflicts = useMemo(() => computeConflicts(blocks), [blocks]);
  const scheduledFromBoard = blocks.filter((b) => b.source === 'board').length;

  // ---- undo / redo over both collections ----
  // Entries are coalesced on idle, so one drag or one burst of typing is a
  // single undo step rather than thirty.
  const histRef = useRef([]);
  const idxRef = useRef(-1);
  const restoring = useRef(false);
  const [, bumpHistory] = useState(0);

  const pushHistory = useCallback((snapshot) => {
    if (histRef.current[idxRef.current] === snapshot) return;
    let next = [...histRef.current.slice(0, idxRef.current + 1), snapshot];
    if (next.length > HISTORY_LIMIT) next = next.slice(next.length - HISTORY_LIMIT);
    histRef.current = next;
    idxRef.current = next.length - 1;
    bumpHistory((n) => n + 1);
  }, []);

  useEffect(() => {
    const snapshot = JSON.stringify({ activities, tasks });
    if (histRef.current.length === 0) {
      pushHistory(snapshot);
      return undefined;
    }
    if (restoring.current) {
      restoring.current = false;
      return undefined;
    }
    const t = setTimeout(() => pushHistory(snapshot), HISTORY_IDLE_MS);
    return () => clearTimeout(t);
  }, [activities, tasks, pushHistory]);

  const restore = useCallback(
    (idx) => {
      const state = JSON.parse(histRef.current[idx]);
      idxRef.current = idx;
      restoring.current = true;
      setVault({ activities: state.activities, tasks: state.tasks });
      setSelectedKey(null);
      bumpHistory((n) => n + 1);
    },
    [setVault]
  );

  const canUndo = idxRef.current > 0;
  const canRedo = idxRef.current < histRef.current.length - 1;
  const undo = useCallback(() => {
    if (idxRef.current > 0) restore(idxRef.current - 1);
  }, [restore]);
  const redo = useCallback(() => {
    if (idxRef.current < histRef.current.length - 1) restore(idxRef.current + 1);
  }, [restore]);

  // ---- writes routed by block key ----
  const patchBlock = useCallback(
    (key, patch) => {
      const { kind, id } = parseKey(key);
      if (kind === 'a') setActivities((prev) => prev.map((a) => (String(a.id) === id ? { ...a, ...patch } : a)));
      else setTasks((prev) => prev.map((t) => (String(t.id) === id ? { ...t, ...patch } : t)));
    },
    [setActivities, setTasks]
  );

  const addActivity = useCallback(() => {
    const gaps = computeFreeGaps(blocks);
    let start = 12;
    let dur = 1;
    if (gaps.length) {
      const g = gaps.reduce((m, x) => (x[1] - x[0] > m[1] - m[0] ? x : m));
      start = snap(g[0] % 24);
      dur = Math.min(1, Math.max(0.5, g[1] - g[0]));
    }
    const id = `act_${Date.now()}`;
    const used = SHADE_PRESETS.slice(0, 4).map((s) => activities.filter((a) => a.color === s).length);
    const color = SHADE_PRESETS[used.indexOf(Math.min(...used))];
    setActivities((prev) => [...prev, { id, start: floatToTime(start), end: floatToTime(start + dur), color, label: 'New block' }]);
    setSelectedKey(`a:${id}`);
  }, [blocks, activities, setActivities]);

  const duplicateBlock = (block) => {
    const d = durationOf(block);
    const ns = timeToFloat(block.start) + d;
    const id = `act_${Date.now()}`;
    setActivities((prev) => [
      ...prev,
      {
        id,
        label: block.label,
        color: block.color,
        start: floatToTime(ns),
        end: floatToTime(ns + d),
      },
    ]);
    setSelectedKey(`a:${id}`);
  };

  /** Planner blocks are deleted; board blocks are only unscheduled. */
  const removeBlock = (block) => {
    if (block.source === 'board') patchBlock(block.key, { start: '', end: '' });
    else setActivities((prev) => prev.filter((a) => `a:${a.id}` !== block.key));
    setSelectedKey(null);
  };

  const loadSampleDay = () => setActivities(DEFAULT_DAY);

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `day-clock-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (!meta && e.key.toLowerCase() === 'n') {
        addActivity();
        return;
      }
      const block = blocks.find((b) => b.key === selectedKey);
      if (!block) return;

      const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (dir) {
        e.preventDefault();
        if (e.shiftKey) {
          const nd = durationOf(block) + dir * SNAP;
          if (nd < 0.25 || nd > 23.75) return;
          patchBlock(block.key, { end: floatToTime(timeToFloat(block.start) + nd) });
        } else {
          const d = durationOf(block);
          const ns = timeToFloat(block.start) + dir * SNAP;
          patchBlock(block.key, { start: floatToTime(ns), end: floatToTime(ns + d) });
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeBlock(block);
      }
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateBlock(block);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <PageHeader
        title="WisePlanner"
        subtitle={
          scheduledFromBoard
            ? `${blocks.length} block${blocks.length === 1 ? '' : 's'} today · ${scheduledFromBoard} pulled in from your board.`
            : 'Drag a slice to move it, or grab an edge to resize. Times snap to 15 minutes.'
        }
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo · Ctrl+Z"
            className="keep-btn keep-btn-outline px-2.5 disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon name="undo-left-round-linear" size={18} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo · Ctrl+Shift+Z"
            className="keep-btn keep-btn-outline px-2.5 disabled:pointer-events-none disabled:opacity-30"
          >
            <Icon name="undo-right-round-linear" size={18} />
          </button>
        </div>
        <button type="button" onClick={exportPng} className="keep-btn keep-btn-outline">
          <Icon name="download-minimalistic-linear" size={18} />
          <span className="hidden sm:block">Export PNG</span>
        </button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-2 pb-2 md:px-0 lg:flex-row">
        {/* ---------- block list ---------- */}
        <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-panel border border-edge bg-surface lg:w-[340px]">
          <div className="flex items-center justify-between border-b border-edge px-5 py-4">
            <h2 className="text-[15px] font-semibold text-white">Today&apos;s blocks</h2>
            <span className="rounded-full border border-edge bg-[#0a0a0a] px-3 py-1 text-xs font-bold text-soft">
              {blocks.length}
            </span>
          </div>

          <div className="flex max-h-[38vh] flex-1 flex-col gap-3 overflow-y-auto p-4 lg:max-h-none">
            {blocks.length === 0 ? (
              <div className="rounded-panel border border-dashed border-edge py-12 text-center">
                <p className="text-sm font-semibold text-muted">A blank day</p>
                <p className="mt-1 text-xs font-medium text-muted opacity-70">Press N to add your first block</p>
                <button type="button" onClick={loadSampleDay} className="mt-4 text-xs font-semibold text-neutral-300 underline underline-offset-4 hover:text-white">
                  Or load a sample day
                </button>
              </div>
            ) : null}

            {blocks.map((block, i) => (
              <BlockCard
                key={block.key}
                block={block}
                selected={selectedKey === block.key}
                conflicted={conflicts.has(i)}
                onSelect={() => setSelectedKey(block.key)}
                onPatch={(patch) => patchBlock(block.key, patch)}
                onDuplicate={() => duplicateBlock(block)}
                onRemove={() => removeBlock(block)}
              />
            ))}
          </div>

          <div className="border-t border-edge p-4">
            <button type="button" onClick={addActivity} className="keep-btn keep-btn-primary w-full">
              <Icon name="add-square-linear" size={16} /> Add block
            </button>
            <Link href="/board" className="keep-btn keep-btn-ghost mt-2 w-full">
              <Icon name="widget-4-linear" size={16} /> Schedule from board
            </Link>
          </div>
        </div>

        {/* ---------- dial ---------- */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-panel border border-edge bg-surface p-4">
          <ClockCanvas
            canvasRef={canvasRef}
            blocks={blocks}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onChange={patchBlock}
          />
        </div>
      </div>
    </>
  );
}

function BlockCard({ block, selected, conflicted, onSelect, onPatch, onDuplicate, onRemove }) {
  const fromBoard = block.source === 'board';

  return (
    <div
      onClick={(e) => {
        if (!e.target.closest('button, input, label')) onSelect();
      }}
      className={`anim-rise group flex shrink-0 cursor-pointer flex-col gap-3 rounded-panel border bg-raised p-4 transition-colors ${
        selected ? 'border-white' : 'border-transparent hover:border-edgeStrong'
      }`}
    >
      <div className="flex items-center gap-2">
        {fromBoard ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_META[block.priority]?.dot || 'bg-neutral-500'}`} />
            <span className="truncate text-[15px] font-bold text-white">{block.label}</span>
          </span>
        ) : (
          <input
            type="text"
            value={block.label}
            placeholder="Untitled"
            onChange={(e) => onPatch({ label: e.target.value })}
            className="w-full border-none bg-transparent text-[15px] font-bold text-white outline-none placeholder:text-muted"
          />
        )}

        {conflicted ? (
          <span className="shrink-0 rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-400">Overlap</span>
        ) : null}

        {!fromBoard ? (
          <button
            type="button"
            title="Duplicate · D"
            onClick={onDuplicate}
            className="shrink-0 p-1 text-soft opacity-0 transition-opacity hover:text-white group-hover:opacity-60"
          >
            <Icon name="copy-linear" size={15} />
          </button>
        ) : null}

        <button
          type="button"
          title={fromBoard ? 'Remove from planner' : 'Delete'}
          onClick={onRemove}
          className="shrink-0 p-1 text-soft opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-60"
        >
          <Icon name="trash-bin-minimalistic-linear" size={15} />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TimePicker value={block.start} onChange={(v) => onPatch({ start: v })} />
        <Icon name="arrow-right-linear" size={14} className="text-muted" />
        <TimePicker value={block.end} onChange={(v) => onPatch({ end: v })} />
      </div>

      <div className="flex items-center justify-between">
        {fromBoard ? (
          <Link
            href="/board"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-full border border-edge bg-[#0a0a0a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-soft transition-colors hover:text-white"
          >
            <Icon name="widget-4-linear" size={12} /> Board card
          </Link>
        ) : (
          <div className="flex items-center gap-1.5">
            {SHADE_PRESETS.map((shade) => (
              <button
                key={shade}
                type="button"
                style={{ background: shade }}
                onClick={() => {
                  onPatch({ color: shade });
                }}
                className={`shade-dot ${shade.toLowerCase() === String(block.color).toLowerCase() ? 'on' : ''}`}
              />
            ))}
            <label
              className={`shade-dot rainbow relative overflow-hidden ${
                SHADE_PRESETS.some((p) => p.toLowerCase() === String(block.color).toLowerCase()) ? '' : 'on'
              }`}
              title="Custom colour"
            >
              <input
                type="color"
                value={block.color || '#8f8f8f'}
                onChange={(e) => onPatch({ color: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}

        <span className="text-[11px] font-semibold tabular-nums text-muted">{fmtDur(durationOf(block))}</span>
      </div>
    </div>
  );
}
