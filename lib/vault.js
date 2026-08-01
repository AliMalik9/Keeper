import CryptoJS from 'crypto-js';

export const STORAGE_KEY = 'keepVaultEncrypted';
export const SESSION_KEY = 'keepSessionAuth';
export const AUTO_LOCK_MS = 15 * 60 * 1000;

/**
 * A fresh empty vault. This is a factory on purpose: a shared constant would
 * hand the same `notes`/`tasks`/`activities` arrays to every caller, so one
 * in-place mutation anywhere would poison every later "empty" vault.
 */
export const emptyVault = () => ({ notes: [], tasks: [], activities: [] });

/**
 * Older builds stored a bare array of notes. Normalise whatever comes out of
 * the ciphertext into the three-collection shape the workspace now uses.
 */
export function normalize(raw) {
  if (Array.isArray(raw)) return { ...emptyVault(), notes: raw };
  if (!raw || typeof raw !== 'object') return emptyVault();
  return {
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    activities: Array.isArray(raw.activities) ? raw.activities : [],
  };
}

export function encryptVault(data, pin) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), pin).toString();
}

/** Returns the normalised vault, or null when the PIN does not match. */
export function decryptVault(ciphertext, pin) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, pin);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    return normalize(JSON.parse(text));
  } catch {
    return null;
  }
}

export function hasVault() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function readSession() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

export function writeSession(pin) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ pin, lastActive: Date.now() }));
}

export function touchSession() {
  const s = readSession();
  if (!s.pin) return;
  s.lastActive = Date.now();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function sessionIsFresh(s) {
  return Boolean(s.pin && s.lastActive && Date.now() - s.lastActive < AUTO_LOCK_MS);
}
