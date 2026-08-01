'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useVault } from '@/app/providers';
import { PageHeader } from '@/components/AppShell';
import TimePicker from '@/components/TimePicker';
import { PRIORITIES, PRIORITY_META } from '@/lib/blocks';
import { durationOf, floatToTime, fmtDur, fmtTime12, timeToFloat } from '@/lib/time';

const emptyDraft = () => ({
  id: null,
  title: '',
  desc: '',
  priority: 'P2',
  image: '',
  link: '',
  start: '',
  end: '',
});

/** A card is drawn on the planner only when it has two distinct times. */
export const isScheduled = (t) => Boolean(t.start && t.end && t.start !== t.end);

export default function BoardView() {
  const { tasks, setTasks } = useVault();
  const [draft, setDraft] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const byPriority = useMemo(() => {
    const map = Object.fromEntries(PRIORITIES.map((p) => [p, []]));
    tasks.forEach((t) => (map[t.priority] || map.P2).push(t));
    return map;
  }, [tasks]);

  const scheduledCount = tasks.filter(isScheduled).length;

  const saveDraft = () => {
    if (!draft.title.trim()) return;
    const clean = {
      title: draft.title.trim(),
      desc: draft.desc.trim(),
      priority: draft.priority,
      image: draft.image.trim(),
      link: draft.link.trim(),
      // Half-filled times would silently never reach the planner, so drop them.
      start: isScheduled(draft) ? draft.start : '',
      end: isScheduled(draft) ? draft.end : '',
    };
    if (draft.id) setTasks((prev) => prev.map((t) => (t.id === draft.id ? { ...t, ...clean } : t)));
    else setTasks((prev) => [...prev, { ...clean, id: `task_${Date.now()}`, createdAt: Date.now() }]);
    setDraft(null);
  };

  const deleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const dropOn = (priority) => {
    setOverCol(null);
    if (!dragId) return;
    setTasks((prev) => prev.map((t) => (t.id === dragId ? { ...t, priority } : t)));
    setDragId(null);
  };

  return (
    <>
      <PageHeader
        title="Kanban Board"
        subtitle={
          scheduledCount
            ? `${tasks.length} card${tasks.length === 1 ? '' : 's'} · ${scheduledCount} scheduled on your day clock.`
            : 'Give a card a start and end time and it appears on your day clock.'
        }
      >
        <Link href="/planner" className="keep-btn keep-btn-outline">
          <Icon name="clock-circle-linear" size={18} />
          <span className="hidden sm:block">Open planner</span>
        </Link>
        <button type="button" onClick={() => setDraft(emptyDraft())} className="keep-btn keep-btn-primary">
          <Icon name="add-square-linear" size={18} /> Add Card
        </button>
      </PageHeader>

      <div className="flex flex-1 items-start gap-6 overflow-x-auto px-2 pb-6 md:px-0">
        {PRIORITIES.map((p) => {
          const meta = PRIORITY_META[p];
          const items = byPriority[p];
          return (
            <div
              key={p}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(p);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverCol((c) => (c === p ? null : c));
              }}
              onDrop={() => dropOn(p)}
              className={`flex max-h-full w-[320px] shrink-0 flex-col rounded-panel border border-edge bg-surface p-2 transition-all ${
                overCol === p ? 'kanban-over' : ''
              }`}
            >
              <div className="mb-2 flex items-center justify-between rounded-card border border-edge bg-raised p-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  {meta.name}
                </h2>
                <span className="rounded-full border border-edge bg-[#0a0a0a] px-3 py-1 text-xs font-bold text-soft">
                  {items.length}
                </span>
              </div>

              <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto p-1">
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dragging={dragId === task.id}
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    onEdit={() => setDraft({ ...emptyDraft(), ...task })}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}

                {items.length === 0 ? (
                  <div className="rounded-card border border-dashed border-edge py-10 text-center">
                    <p className="text-[13px] font-medium text-muted">Nothing here yet</p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {draft ? <CardModal draft={draft} setDraft={setDraft} onClose={() => setDraft(null)} onSave={saveDraft} /> : null}
    </>
  );
}

function TaskCard({ task, dragging, onDragStart, onDragEnd, onEdit, onDelete }) {
  const scheduled = isScheduled(task);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className={`group relative cursor-grab overflow-hidden rounded-card border border-edge bg-raised p-4 transition-all hover:border-[#444444] active:cursor-grabbing ${
        dragging ? 'kanban-dragging' : ''
      }`}
    >
      <button
        type="button"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-edge bg-surface/90 text-soft opacity-0 shadow-sm backdrop-blur transition-all hover:text-red-400 group-hover:opacity-100"
      >
        <Icon name="trash-bin-minimalistic-linear" size={15} />
      </button>

      {task.image ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-edge bg-[#0a0a0a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={task.image}
            alt=""
            className="pointer-events-none h-32 w-full object-cover"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = 'none';
            }}
          />
        </div>
      ) : null}

      <h4 className="mb-1.5 pr-6 text-[15px] font-semibold leading-snug text-white">{task.title}</h4>

      {task.desc ? <p className="line-clamp-3 text-[13.5px] leading-relaxed text-soft">{task.desc}</p> : null}

      {scheduled ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-edge bg-[#0a0a0a] px-3 py-2">
          <Icon name="alarm-linear" size={15} className="text-white" />
          <span className="text-[12px] font-semibold tabular-nums text-white">
            {fmtTime12(task.start)} – {fmtTime12(task.end)}
          </span>
          <span className="ml-auto text-[11px] font-medium text-muted">{fmtDur(durationOf(task))}</span>
        </div>
      ) : null}

      {task.link ? (
        <div className="mt-3 border-t border-edge pt-3">
          <a
            href={task.link}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-[#0a0a0a] px-3 py-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:bg-hover"
          >
            <Icon name="link-minimalistic-2-linear" size={14} className="text-muted" />
            Resource link
          </a>
        </div>
      ) : null}
    </div>
  );
}

function CardModal({ draft, setDraft, onClose, onSave }) {
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const scheduled = isScheduled(draft);

  // Picking one end of the range fills the other in an hour away, so a card can
  // never end up half-scheduled and quietly missing from the planner.
  const setStart = (v) => set({ start: v, end: draft.end || floatToTime(timeToFloat(v) + 1) });
  const setEnd = (v) => set({ end: v, start: draft.start || floatToTime(timeToFloat(v) - 1) });

  // Ticking the box opens a one-hour slot starting at the next half hour, so
  // there is always something valid on the clock to drag from.
  const toggleSchedule = () => {
    if (scheduled) {
      set({ start: '', end: '' });
      return;
    }
    const now = new Date();
    const startFloat = Math.ceil((now.getHours() + now.getMinutes() / 60) * 2) / 2;
    set({ start: floatToTime(startFloat), end: floatToTime(startFloat + 1) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-panel border border-edge bg-surface shadow-2xl">
        <div className="flex items-center justify-between px-7 pb-4 pt-7">
          <h3 className="text-[20px] font-semibold tracking-tight text-white">{draft.id ? 'Edit card' : 'Create card'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-edge bg-raised text-soft transition-colors hover:text-white"
          >
            <Icon name="close-circle-linear" size={18} />
          </button>
        </div>

        <div className="space-y-5 px-7 pb-2">
          <Field label="Title *" htmlFor="card-title">
            <input
              id="card-title"
              autoFocus
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="What needs to be done?"
              className="keep-input"
            />
          </Field>

          <Field label="Priority" htmlFor="card-priority">
            <div className="relative">
              <select
                id="card-priority"
                value={draft.priority}
                onChange={(e) => set({ priority: e.target.value })}
                className="keep-input cursor-pointer appearance-none pr-10"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-raised text-white">
                    {PRIORITY_META[p].name}
                  </option>
                ))}
              </select>
              <Icon
                name="alt-arrow-down-linear"
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </Field>

          <Field label="Description" htmlFor="card-desc">
            <textarea
              id="card-desc"
              rows={2}
              value={draft.desc}
              onChange={(e) => set({ desc: e.target.value })}
              placeholder="Add some details..."
              className="keep-input resize-none leading-relaxed"
            />
          </Field>

          {/* ---- schedule ---- */}
          <div className="rounded-panel border border-edge bg-[#0a0a0a] p-5">
            <label className="flex cursor-pointer select-none items-center gap-3">
              <input type="checkbox" checked={scheduled} onChange={toggleSchedule} className="mt-0" />
              <Icon name="alarm-linear" size={17} className={scheduled ? 'text-white' : 'text-muted'} />
              <span className={`text-[14px] font-semibold ${scheduled ? 'text-white' : 'text-soft'}`}>Time duration</span>
              {scheduled ? (
                <span className="ml-auto text-[12px] font-bold tabular-nums text-white">{fmtDur(durationOf(draft))}</span>
              ) : null}
            </label>

            {scheduled ? (
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <TimePicker value={draft.start} placeholder="Start" onChange={setStart} />
                <Icon name="arrow-right-linear" size={16} className="text-muted" />
                <TimePicker value={draft.end} placeholder="End" onChange={setEnd} />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cover image" htmlFor="card-image">
              <input
                id="card-image"
                type="url"
                value={draft.image}
                onChange={(e) => set({ image: e.target.value })}
                placeholder="https://..."
                className="keep-input"
              />
            </Field>
            <Field label="Resource link" htmlFor="card-link">
              <input
                id="card-link"
                type="url"
                value={draft.link}
                onChange={(e) => set({ link: e.target.value })}
                placeholder="https://..."
                className="keep-input"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-edge bg-[#0a0a0a] px-7 py-4">
          <button type="button" onClick={onClose} className="keep-btn keep-btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.title.trim()}
            className="keep-btn keep-btn-primary disabled:opacity-40"
          >
            {draft.id ? 'Save changes' : 'Add card'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block pl-1 text-[13px] font-semibold text-white">
        {label}
      </label>
      {children}
    </div>
  );
}
