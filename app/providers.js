'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AUTO_LOCK_MS,
  STORAGE_KEY,
  clearSession,
  decryptVault,
  emptyVault,
  encryptVault,
  readSession,
  sessionIsFresh,
  touchSession,
  writeSession,
} from '@/lib/vault';

const VaultContext = createContext(null);

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used inside <VaultProvider>');
  return ctx;
}

export function VaultProvider({ children }) {
  // 'loading' | 'new' | 'locked' | 'unlocked'
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(emptyVault);
  const [saveError, setSaveError] = useState('');

  const dataRef = useRef(emptyVault());
  const pinRef = useRef('');

  /**
   * Writes the whole workspace to localStorage. This is the only writer, and it
   * only ever overwrites — nothing in the app removes the vault, and there is
   * no expiry: data stays until the user imports over it or clears their
   * browser storage. Locking wipes memory but never touches what is stored.
   */
  const persist = useCallback((next) => {
    if (!pinRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, encryptVault(next, pinRef.current));
      setSaveError('');
    } catch (err) {
      // A silent failure here would look exactly like working software right
      // up until the reload that loses everything, so surface it.
      console.error('Could not write the vault:', err);
      setSaveError(err?.name === 'QuotaExceededError' ? 'Browser storage is full — changes are not being saved.' : 'Changes could not be saved to this browser.');
    }
  }, []);

  /** The single write path for every collection in the workspace. */
  const update = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(dataRef.current) : updater;
      dataRef.current = next;
      setData(next);
      persist(next);
    },
    [persist]
  );

  /** Writes several collections in one commit — used by planner undo/redo. */
  const setVault = useCallback((patch) => update((d) => ({ ...d, ...patch })), [update]);

  const setNotes = useCallback((v) => update((d) => ({ ...d, notes: typeof v === 'function' ? v(d.notes) : v })), [update]);
  const setTasks = useCallback((v) => update((d) => ({ ...d, tasks: typeof v === 'function' ? v(d.tasks) : v })), [update]);
  const setActivities = useCallback(
    (v) => update((d) => ({ ...d, activities: typeof v === 'function' ? v(d.activities) : v })),
    [update]
  );

  const adopt = useCallback((vault, pin) => {
    pinRef.current = pin;
    dataRef.current = vault;
    setData(vault);
    writeSession(pin);
    setStatus('unlocked');
  }, []);

  // Restore a still-warm session on mount.
  useEffect(() => {
    const ciphertext = localStorage.getItem(STORAGE_KEY);
    if (!ciphertext) {
      setStatus('new');
      return;
    }
    const session = readSession();
    if (sessionIsFresh(session)) {
      const vault = decryptVault(ciphertext, session.pin);
      if (vault) {
        adopt(vault, session.pin);
        return;
      }
      clearSession();
    }
    setStatus('locked');
  }, [adopt]);

  /** Creates the vault for a first-time user. */
  const createVault = useCallback(
    (pin) => {
      pinRef.current = pin;
      const vault = emptyVault();
      dataRef.current = vault;
      persist(vault);
      adopt(vault, pin);
      return true;
    },
    [adopt, persist]
  );

  const unlock = useCallback(
    (pin) => {
      const ciphertext = localStorage.getItem(STORAGE_KEY);
      if (!ciphertext) return createVault(pin);
      const vault = decryptVault(ciphertext, pin);
      if (!vault) return false;
      adopt(vault, pin);
      return true;
    },
    [adopt, createVault]
  );

  /** Unlocks a .keep file and installs it as this device's vault. */
  const importBackup = useCallback(
    (ciphertext, pin) => {
      const vault = decryptVault(ciphertext, pin);
      if (!vault) return false;
      localStorage.setItem(STORAGE_KEY, ciphertext);
      adopt(vault, pin);
      return true;
    },
    [adopt]
  );

  /** Clears the in-memory copy only. The stored vault is left untouched. */
  const lock = useCallback(() => {
    pinRef.current = '';
    dataRef.current = emptyVault();
    setData(emptyVault());
    clearSession();
    setStatus('locked');
  }, []);

  const exportBackup = useCallback(() => {
    const ciphertext = localStorage.getItem(STORAGE_KEY);
    if (!ciphertext) return;
    const blob = new Blob([ciphertext], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keep-backup-${new Date().toISOString().split('T')[0]}.keep`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Idle auto-lock.
  useEffect(() => {
    if (status !== 'unlocked') return undefined;
    const bump = () => touchSession();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'pointerdown'];
    events.forEach((e) => document.addEventListener(e, bump));
    const timer = setInterval(() => {
      const s = readSession();
      if (s.lastActive && Date.now() - s.lastActive > AUTO_LOCK_MS) lock();
    }, 5000);
    return () => {
      events.forEach((e) => document.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [status, lock]);

  const value = {
    status,
    saveError,
    notes: data.notes,
    tasks: data.tasks,
    activities: data.activities,
    setNotes,
    setTasks,
    setActivities,
    setVault,
    unlock,
    importBackup,
    lock,
    exportBackup,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
