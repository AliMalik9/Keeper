'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { useVault } from '@/app/providers';

export default function LockGate({ children }) {
  const { status, unlock, importBackup } = useVault();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [pendingImport, setPendingImport] = useState(null);
  const inputs = useRef([]);
  const fileRef = useRef(null);

  const locked = status !== 'unlocked';

  useEffect(() => {
    if (locked && status !== 'loading') {
      const t = setTimeout(() => inputs.current[0]?.focus(), 120);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [locked, status]);

  const clearPin = () => {
    setDigits(['', '', '', '']);
    setTimeout(() => inputs.current[0]?.focus(), 0);
  };

  const fail = (msg) => {
    setError(msg);
    clearPin();
    setTimeout(() => setError(''), 3000);
  };

  const submit = (pin) => {
    if (pin.length < 4) return;
    if (pendingImport) {
      if (importBackup(pendingImport, pin)) {
        setPendingImport(null);
        setDigits(['', '', '', '']);
      } else {
        fail('That PIN does not match this backup file.');
      }
      return;
    }
    if (unlock(pin)) setDigits(['', '', '', '']);
    else fail('Incorrect PIN. Please try again.');
  };

  const onDigit = (i, raw) => {
    const v = raw.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (!v) return;
    if (i < 3) inputs.current[i + 1]?.focus();
    else {
      inputs.current[i]?.blur();
      setTimeout(() => submit(next.join('')), 40);
    }
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'Enter') submit(digits.join(''));
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImport(String(ev.target.result));
      clearPin();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isNew = status === 'new';
  const title = pendingImport ? 'Unlock backup' : isNew ? 'Welcome to Keep' : 'Welcome back';
  const subtitle = pendingImport
    ? 'Backup loaded. Enter the PIN originally used to secure this file.'
    : isNew
      ? 'Create a 4-digit PIN to secure your workspace on this device.'
      : 'Enter your 4-digit PIN to unlock your workspace.';

  return (
    <>
      <div className={locked ? 'pointer-events-none h-full opacity-0' : 'h-full opacity-100 transition-opacity duration-500'}>
        {status === 'unlocked' ? children : null}
      </div>

      {locked ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black px-4 transition-opacity duration-300 ${
            status === 'loading' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex w-full max-w-md flex-col items-center rounded-pill border border-edge bg-surface p-10 shadow-2xl">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-edgeStrong bg-raised text-white">
              <Icon name="lock-password-bold" size={24} />
            </div>

            <h2 className="mb-2 text-center text-[22px] font-bold text-white">{title}</h2>
            <p className="mb-8 text-center text-[15px] text-soft">{subtitle}</p>

            <div className="mb-4 flex justify-center gap-4">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  className={`h-16 w-14 rounded-2xl border bg-[#0a0a0a] text-center text-3xl font-bold text-white outline-none transition-all focus:ring-2 focus:ring-white/20 ${
                    error ? 'border-red-500/50 ring-2 ring-red-500/50' : 'border-edge'
                  }`}
                />
              ))}
            </div>

            {/* Reserves its line so the panel does not jump when an error appears. */}
            <p role="alert" className={`mb-2 min-h-[20px] text-sm font-medium text-red-400`}>
              {error}
            </p>

            <div className="my-8 h-px w-full bg-edge" />

            {pendingImport ? (
              <button
                type="button"
                onClick={() => {
                  setPendingImport(null);
                  clearPin();
                }}
                className="text-[14px] font-medium text-muted transition-colors hover:text-white"
              >
                Cancel import
              </button>
            ) : (
              <div className="w-full text-center">
                <p className="mb-3 text-[14px] text-muted">Already have a workspace on another device?</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 text-[14px] font-medium text-neutral-300 transition-colors hover:text-white"
                >
                  <Icon name="import-bold" size={18} /> Import backup file (.keep)
                </button>
                <input ref={fileRef} type="file" accept=".keep" className="hidden" onChange={onFile} />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
