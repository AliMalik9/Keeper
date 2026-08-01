'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import Icon from '@/components/Icon';
import { useVault } from '@/app/providers';
import { PageHeader } from '@/components/AppShell';
import useMasonry from './useMasonry';

const BLANK_HTML = new Set(['', '<br>', '<div><br></div>']);
const clean = (html) => {
  const t = (html || '').trim();
  return BLANK_HTML.has(t) ? '' : t;
};

function FormatBar({ showLists }) {
  const cmd = (e, name) => {
    e.preventDefault();
    document.execCommand(name, false, null);
  };
  return (
    <div className="flex items-center rounded-xl border border-edge bg-raised p-1 shadow-sm">
      <button
        type="button"
        title="Bold"
        onMouseDown={(e) => cmd(e, 'bold')}
        className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-neutral-300 transition-colors hover:bg-edge"
      >
        B
      </button>
      <button
        type="button"
        title="Italic"
        onMouseDown={(e) => cmd(e, 'italic')}
        className="flex h-8 w-8 items-center justify-center rounded-lg font-serif italic text-neutral-300 transition-colors hover:bg-edge"
      >
        I
      </button>
      <button
        type="button"
        title="Strikethrough"
        onMouseDown={(e) => cmd(e, 'strikeThrough')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-300 line-through transition-colors hover:bg-edge"
      >
        S
      </button>
      {showLists ? (
        <div className="flex items-center">
          <div className="mx-1 h-5 w-px bg-edgeStrong" />
          <button
            type="button"
            title="Bullet list"
            onMouseDown={(e) => cmd(e, 'insertUnorderedList')}
            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-neutral-300 transition-colors hover:bg-edge"
          >
            •
          </button>
          <button
            type="button"
            title="Numbered list"
            onMouseDown={(e) => cmd(e, 'insertOrderedList')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-medium text-neutral-300 transition-colors hover:bg-edge"
          >
            1.
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * An uncontrolled rich-text field. The DOM is only rewritten when the incoming
 * html differs from what is already there, so typing never resets the caret.
 */
function EditableText({ html, onChange, onKeyDown, placeholder, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== (html || '')) el.innerHTML = html || '';
  }, [html]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
      onKeyDown={onKeyDown}
      className={className}
    />
  );
}

/**
 * One row of a checklist.
 *
 * `mode="toggle"` is the note card: the whole row is the hit target, so a click
 * anywhere fades and strikes the item through. `mode="edit"` is the composer
 * and the edit modal, where the text is editable and only the box toggles.
 */
function ChecklistRow({ item, mode = 'edit', onToggle, onText, onRemove, compact = false }) {
  const toggling = mode === 'toggle';

  const textClass = `rich-content min-w-0 flex-1 text-[14.5px] leading-relaxed transition-all duration-200 ${
    item.checked ? 'text-muted line-through opacity-50' : 'text-neutral-200'
  }`;

  return (
    <div
      onClick={
        toggling
          ? (e) => {
              e.stopPropagation();
              onToggle();
            }
          : undefined
      }
      className={`group/item -mx-2 flex items-start gap-3 rounded-lg px-2 transition-colors hover:bg-white/[0.035] ${
        compact ? 'py-[3px]' : 'py-1'
      } ${toggling ? 'cursor-pointer select-none' : ''}`}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggle}
        className="mt-[3px]"
      />

      {toggling ? (
        <div className={textClass} dangerouslySetInnerHTML={{ __html: item.text }} />
      ) : (
        <EditableText html={item.text} onChange={onText} className={`${textClass} outline-none`} />
      )}

      {onRemove ? (
        <button
          type="button"
          title="Remove item"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-1 mt-[1px] p-1 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover/item:opacity-100"
        >
          <Icon name="close-circle-linear" size={17} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * A note's checklist, split the way a to-do list is actually read: everything
 * still open at the top, everything done collected under a "Finished" divider.
 */
function Checklist({ items, mode = 'edit', onToggle, onText, onRemove, compact = false }) {
  const open = [];
  const done = [];
  items.forEach((item, index) => (item.checked ? done : open).push({ item, index }));

  return (
    <div className="mt-2">
      <div className="space-y-0.5">
        {open.map(({ item, index }) => (
          <ChecklistRow
            key={index}
            item={item}
            mode={mode}
            compact={compact}
            onToggle={() => onToggle(index)}
            onText={onText ? (html) => onText(index, html) : undefined}
            onRemove={onRemove ? () => onRemove(index) : undefined}
          />
        ))}
      </div>

      {done.length ? (
        <>
          <div className="mb-1 mt-3 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted opacity-70">Finished</span>
            <span className="h-px flex-1 bg-edge" />
          </div>
          <div className="space-y-0.5">
            {done.map(({ item, index }) => (
              <ChecklistRow
                key={index}
                item={item}
                compact={compact}
                onToggle={() => onToggle(index)}
                onText={onText ? (html) => onText(index, html) : undefined}
                onRemove={onRemove ? () => onRemove(index) : undefined}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function NotesView() {
  const { notes, setNotes } = useVault();
  const [view, setView] = useState('grid');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);

  // ---- composer ----
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [listMode, setListMode] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const composerRef = useRef(null);
  const contentRef = useRef(null);
  const newItemRef = useRef(null);

  const resetComposer = useCallback(() => {
    setTitle('');
    setListMode(false);
    setDraftItems([]);
    if (contentRef.current) contentRef.current.innerHTML = '';
    if (newItemRef.current) newItemRef.current.innerHTML = '';
  }, []);

  const saveComposer = useCallback(() => {
    const t = title.trim();
    const content = clean(contentRef.current?.innerHTML);
    const items = [...draftItems];
    if (listMode) {
      const pending = clean(newItemRef.current?.innerHTML);
      if (pending) items.push({ text: pending, checked: false });
    }
    if (t || content || items.length) {
      // New notes go to the front, which in a left-to-right grid is the
      // top-left slot — where you just were looking.
      setNotes((prev) => [
        {
          id: Date.now(),
          type: listMode ? 'list' : 'text',
          title: t,
          content: listMode ? '' : content,
          listItems: listMode ? items : [],
        },
        ...prev,
      ]);
    }
    resetComposer();
    setExpanded(false);
  }, [title, draftItems, listMode, setNotes, resetComposer]);

  // Clicking away from an open composer saves it, matching the original app.
  useEffect(() => {
    if (!expanded) return undefined;
    const onDown = (e) => {
      if (composerRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-note-modal]')) return;
      saveComposer();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded, saveComposer]);

  const toggleListMode = () => {
    if (!listMode) {
      const text = clean(contentRef.current?.innerHTML);
      if (text) {
        setDraftItems((prev) => [...prev, { text, checked: false }]);
        if (contentRef.current) contentRef.current.innerHTML = '';
      }
      setListMode(true);
      setTimeout(() => newItemRef.current?.focus(), 0);
    } else {
      const combined = draftItems.map((i) => i.text).join('<br>');
      setListMode(false);
      setDraftItems([]);
      setTimeout(() => {
        if (contentRef.current) {
          if (combined) contentRef.current.innerHTML = combined;
          contentRef.current.focus();
        }
        if (newItemRef.current) newItemRef.current.innerHTML = '';
      }, 0);
    }
  };

  const addDraftItem = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = clean(e.currentTarget.innerHTML);
    if (!v) return;
    setDraftItems((prev) => [...prev, { text: v, checked: false }]);
    e.currentTarget.innerHTML = '';
  };

  // ---- list rendering ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const inTitle = (n.title || '').toLowerCase().includes(q);
      const inContent = (n.content || '').toLowerCase().includes(q);
      const inList = n.type === 'list' && (n.listItems || []).some((li) => li.text.toLowerCase().includes(q));
      return inTitle || inContent || inList;
    });
  }, [notes, query]);

  const gridRef = useRef(null);
  useEffect(() => {
    if (!gridRef.current) return undefined;
    const sortable = Sortable.create(gridRef.current, {
      animation: 250,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      fallbackClass: 'sortable-fallback',
      forceFallback: true,
      draggable: '.card-wrapper',
      delay: 150,
      delayOnTouchOnly: true,
      onEnd(evt) {
        const { oldIndex, newIndex, item, from } = evt;
        if (oldIndex === newIndex) return;
        // Undo Sortable's DOM move so React stays the only thing reordering.
        if (newIndex > oldIndex) from.insertBefore(item, from.children[oldIndex]);
        else from.insertBefore(item, from.children[oldIndex + 1]);
        setNotes((prev) => {
          const next = [...prev];
          next.splice(newIndex, 0, next.splice(oldIndex, 1)[0]);
          return next;
        });
      },
    });
    return () => sortable.destroy();
  }, [setNotes]);

  useEffect(() => {
    const s = Sortable.get(gridRef.current);
    if (s) s.option('disabled', query.length > 0);
  }, [query]);

  useMasonry(gridRef, { enabled: view === 'grid', gap: 16, minColumnWidth: 260, deps: [filtered, view] });

  const patchNote = (id, patch) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const deleteNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const toggleItem = (note, idx) =>
    patchNote(note.id, { listItems: note.listItems.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it)) });
  const removeItem = (note, idx) => patchNote(note.id, { listItems: note.listItems.filter((_, i) => i !== idx) });

  return (
    <>
      <PageHeader title="My Workspace" subtitle="All notes are encrypted and safely stored on this device.">
        <div className="hidden w-64 items-center rounded-[14px] border border-edge bg-surface px-4 py-2.5 transition-all focus-within:border-[#555] focus-within:ring-4 focus-within:ring-white/5 sm:flex">
          <Icon name="magnifer-linear" size={18} className="mr-2.5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your notes..."
            className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-muted"
          />
        </div>
        <button
          type="button"
          onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
          title="Change view"
          className="keep-btn keep-btn-outline px-2.5"
        >
          <Icon name={view === 'grid' ? 'list-linear' : 'gallery-minimalistic-linear'} size={22} />
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-2 pb-10 md:px-0">
        {/* ---------- composer ---------- */}
        <div className="mb-10 flex w-full justify-center">
          {!expanded ? (
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                setTimeout(() => contentRef.current?.focus(), 40);
              }}
              className="flex h-[52px] w-full max-w-3xl cursor-text items-center rounded-[24px] border border-edge bg-surface px-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all hover:border-[#444444]"
            >
              <span className="text-[15px] font-medium text-muted">Type your note here...</span>
            </button>
          ) : (
            <div
              ref={composerRef}
              className="flex w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-[#444444] bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.5)] ring-4 ring-white/5"
            >
              <div className="w-full px-7 pb-5 pt-6">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                  className="w-full bg-transparent text-[18px] font-semibold leading-relaxed tracking-tight text-white outline-none placeholder:font-medium placeholder:text-muted"
                />

                <div className="my-3 h-px w-full bg-edge/70" />

                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Type your note here..."
                  className={`rich-textarea min-h-[72px] w-full bg-transparent text-left text-[15px] leading-[1.75] text-neutral-200 ${
                    listMode ? 'hidden' : ''
                  }`}
                />

                {listMode ? (
                  <div className="w-full">
                    <Checklist
                      items={draftItems}
                      onToggle={(i) =>
                        setDraftItems((prev) => prev.map((it, x) => (x === i ? { ...it, checked: !it.checked } : it)))
                      }
                      onText={(i, html) => setDraftItems((prev) => prev.map((it, x) => (x === i ? { ...it, text: html } : it)))}
                      onRemove={(i) => setDraftItems((prev) => prev.filter((_, x) => x !== i))}
                    />

                    <div className="mt-2 flex items-start gap-3 rounded-lg py-1 text-muted">
                      <Icon name="add-circle-linear" size={19} className="mt-[3px]" />
                      <div
                        ref={newItemRef}
                        contentEditable
                        suppressContentEditableWarning
                        onKeyDown={addDraftItem}
                        data-placeholder="Add an item, then press Enter"
                        className="rich-textarea flex-1 bg-transparent text-[14.5px] leading-relaxed text-neutral-200 outline-none"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex w-full shrink-0 items-center justify-between border-t border-edge pt-4">
                  <FormatBar showLists={!listMode} />
                  <div className="ml-auto flex items-center">
                    <div className="mr-3 flex gap-1 border-r border-edge pr-3 text-soft">
                      <button
                        type="button"
                        onClick={toggleListMode}
                        title={listMode ? 'Back to plain text' : 'Turn into a checklist'}
                        className={`flex items-center justify-center rounded-xl p-2 transition-colors hover:bg-hover hover:text-white ${
                          listMode ? 'bg-hover text-white' : ''
                        }`}
                      >
                        <Icon name="checklist-minimalistic-linear" size={22} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={saveComposer}
                      className="keep-btn keep-btn-primary"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------- grid ---------- */}
        {filtered.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center py-16 opacity-80">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[22px] border border-edge bg-surface shadow-lg">
              <Icon name="document-add-linear" size={42} className="text-muted" />
            </div>
            <h3 className="mb-1.5 text-[18px] font-semibold tracking-tight text-white">
              {query ? 'No matching notes found' : 'Your workspace is empty'}
            </h3>
            <p className="text-[15px] text-soft">
              {query ? 'Try searching with a different word.' : 'Write your first note above to get started.'}
            </p>
          </div>
        ) : null}

        {/*
          Grid view is measured masonry (see useMasonry): cards fill left to
          right in creation order, then tuck into whichever column is shortest
          so no card leaves a gap under it. List view is a plain column.
        */}
        <div
          ref={gridRef}
          className={`mx-auto w-full ${
            filtered.length === 0 ? 'hidden' : view === 'list' ? 'flex max-w-2xl flex-col gap-4' : 'block'
          }`}
        >
          {filtered.map((note) => (
            <div key={note.id} className="card-wrapper w-full">
              <div
                onClick={() => setEditingId(note.id)}
                className="group relative flex flex-col overflow-hidden rounded-card border border-edge bg-surface transition-all duration-300 hover:border-[#444444]"
              >
                <div className="px-5 pb-14 pt-5">
                  {note.title ? (
                    <h3 className="mb-3 text-[16px] font-semibold leading-snug tracking-tight text-white">{note.title}</h3>
                  ) : null}

                  {note.type === 'list' ? (
                    <Checklist
                      compact
                      mode="toggle"
                      items={note.listItems || []}
                      onToggle={(idx) => toggleItem(note, idx)}
                      onRemove={(idx) => removeItem(note, idx)}
                    />
                  ) : (
                    <div
                      className="rich-content text-[14.5px] leading-[1.7] text-neutral-300"
                      dangerouslySetInnerHTML={{ __html: note.content || '' }}
                    />
                  )}
                </div>

                <div className="absolute bottom-3 right-3 flex cursor-default gap-1 rounded-xl border border-edge bg-surface/90 p-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(note.id);
                    }}
                    className="flex items-center justify-center rounded-lg p-1.5 text-soft transition-colors hover:bg-hover hover:text-white"
                  >
                    <Icon name="pen-new-round-linear" size={18} />
                  </button>
                  <button
                    type="button"
                    title="Delete note"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="flex items-center justify-center rounded-lg p-1.5 text-soft transition-colors hover:bg-hover hover:text-red-400"
                  >
                    <Icon name="trash-bin-minimalistic-linear" size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingId !== null ? (
        <EditNoteModal
          note={notes.find((n) => n.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            patchNote(editingId, patch);
            setEditingId(null);
          }}
        />
      ) : null}
    </>
  );
}

function EditNoteModal({ note, onClose, onSave }) {
  const [title, setTitle] = useState(note?.title || '');
  const [items, setItems] = useState(() => JSON.parse(JSON.stringify(note?.listItems || [])));
  const [isList, setIsList] = useState(note?.type === 'list');
  const contentRef = useRef(null);
  const newItemRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) contentRef.current.innerHTML = note?.content || '';
  }, [note]);

  if (!note) return null;

  const commit = () => {
    if (isList) {
      const pending = clean(newItemRef.current?.innerHTML);
      const next = pending ? [...items, { text: pending, checked: false }] : items;
      onSave({ type: 'list', title: title.trim(), listItems: next, content: '' });
    } else {
      onSave({ type: 'text', title: title.trim(), content: clean(contentRef.current?.innerHTML), listItems: [] });
    }
  };

  return (
    <div
      data-note-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) commit();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-panel border border-edge bg-surface shadow-2xl">
        <div className="overflow-y-auto px-7 pb-6 pt-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="w-full bg-transparent text-[19px] font-semibold leading-relaxed tracking-tight text-white outline-none placeholder:font-medium placeholder:text-muted"
          />

          <div className="my-3 h-px w-full bg-edge/70" />

          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Type your note here..."
            className={`rich-textarea min-h-[100px] w-full bg-transparent text-[15px] leading-[1.75] text-neutral-200 ${
              isList ? 'hidden' : ''
            }`}
          />

          {isList ? (
            <div className="w-full">
              <Checklist
                items={items}
                onToggle={(i) => setItems((prev) => prev.map((it, x) => (x === i ? { ...it, checked: !it.checked } : it)))}
                onText={(i, html) => setItems((prev) => prev.map((it, x) => (x === i ? { ...it, text: html } : it)))}
                onRemove={(i) => setItems((prev) => prev.filter((_, x) => x !== i))}
              />

              <div className="mt-2 flex items-start gap-3 py-1 text-muted">
                <Icon name="add-circle-linear" size={19} className="mt-[3px]" />
                <div
                  ref={newItemRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Add an item, then press Enter"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const v = clean(e.currentTarget.innerHTML);
                    if (!v) return;
                    setItems((prev) => [...prev, { text: v, checked: false }]);
                    e.currentTarget.innerHTML = '';
                  }}
                  className="rich-textarea flex-1 bg-transparent text-[14.5px] leading-relaxed text-neutral-200 outline-none"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-edge bg-[#0a0a0a] p-4 px-6">
          <div className="flex items-center gap-2">
            <FormatBar showLists={!isList} />
            <button
              type="button"
              onClick={() => setIsList((v) => !v)}
              title={isList ? 'Back to plain text' : 'Turn into a checklist'}
              className={`flex items-center justify-center rounded-xl p-2 text-soft transition-colors hover:bg-hover hover:text-white ${
                isList ? 'bg-hover text-white' : ''
              }`}
            >
              <Icon name="checklist-minimalistic-linear" size={21} />
            </button>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="keep-btn keep-btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={commit} className="keep-btn keep-btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
