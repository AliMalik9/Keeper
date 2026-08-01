# KEEP — Workspace

Three local-first apps behind one PIN-locked, encrypted vault, sharing a single
dark monochrome design system.

| App | Route | What it does |
| --- | --- | --- |
| **Notes** | `/notes` | Rich-text notes and checklists, masonry or list view, drag to reorder, search. |
| **Kanban Board** | `/board` | P0–P3 priority columns, drag between columns, cover images, resource links, and a **time duration** per card. |
| **WisePlanner** | `/planner` | A 24-hour day clock. Drag slices to move them, grab an edge to resize. |

## Getting started

```bash
npm install
```

```bash
npm run dev
```

> Do not run `npm run build` while `npm run dev` is up — a production build
> rewrites the same `.next` directory the dev server is serving from and takes
> every page down until dev is restarted. Use `npm run build:check` instead; it
> builds into a throwaway directory and deletes it afterwards.

Open http://localhost:3000. On first run you choose a 4-digit PIN; everything
you create is AES-encrypted under it and written to `localStorage`.

## How the board and the clock stay in sync

Tick **Time duration** on a card and it is drawn on the day clock. There is no
copying step and no sync job:

- `lib/blocks.js` derives the clock's block list on every render from
  `activities` (blocks created on the planner) **plus** `tasks` that carry
  times. A card's schedule therefore has exactly one owner — the card.
- Dragging or resizing a board-owned slice on the clock writes straight back to
  the card, so the board shows the new times immediately.
- Deleting a board-owned slice from the planner only *unschedules* it; the card
  stays on the board. Deleting the card removes the slice.

Blocks that wrap past midnight (e.g. `22:00 → 06:30`) are handled throughout.

## Layout

```
app/
  layout.js          root shell: vault provider -> lock gate -> app shell
  providers.js       encrypted vault state, auto-lock, import/export
  notes|board|planner/page.js
components/
  AppShell.js        sidebar + main column + shared PageHeader
  Sidebar.js         the three workspace links, backup, lock
  LockGate.js        PIN screen and .keep import
  TimePicker.js      shared 12-hour popover, used by the board and the planner
  notes/ board/ planner/
lib/
  vault.js           encrypt/decrypt, session handling
  blocks.js          block derivation, priorities, overlap and gap analysis
  time.js            "HH:MM" <-> float helpers, formatting
```

## Icons

Solar icons, baked into `lib/solar-icons.js` as a subset so there is no icon
dependency or network call at runtime. To add one, list its name in
`scripts/build-icons.mjs` and run:

```bash
npm run icons
```

## Design system

Defined once in `app/globals.css` and `tailwind.config.js`:

- Surfaces: `#000` page · `#111` panel · `#1a1a1a` raised · `#0a0a0a` inset
- Borders: `#262626`, `#333333` on hover
- Text: `#f5f5f5` / `#a3a3a3` / `#737373`
- Radii: 14px controls, 20px cards, 28–32px panels
- White is the only "primary" colour; `red-400` is the single accent, reserved
  for destructive actions and P0.

## Data and encryption

Everything lives in the browser — there is no server or account. Notes, board
cards and planner blocks are written to `localStorage` under a single key
(`keepVaultEncrypted`) on every change.

**Nothing in the app ever deletes that key.** There is no expiry or TTL: data
stays until you delete the item, import a backup over it, or clear the
browser's storage yourself. Locking (manually or after 15 idle minutes) only
clears the in-memory copy and the session PIN — the stored vault is left byte
for byte untouched. If a write ever fails (e.g. storage full), a red banner
says so rather than letting you keep working against nothing.

**Backup** downloads the raw ciphertext as a `.keep` file that can be imported
on another device with the same PIN.

Note that the encryption key is derived from a 4-digit PIN via CryptoJS's
default (OpenSSL EVP-KDF, MD5, 1 iteration). That deters casual snooping of
`localStorage`; it is not resistant to an offline brute-force attack against a
copied vault, since 10,000 PINs is a trivial search space. Treat a `.keep` file
as sensitive, and don't store secrets you would not want recovered by someone
who obtains the file.
