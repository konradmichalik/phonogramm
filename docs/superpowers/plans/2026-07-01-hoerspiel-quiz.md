# ??? Hörspiel-Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil optimiertes „Die drei ???"-Quiz, das per Spotify einen 5-Sek-Ausschnitt abspielt und die geratene Folgennummer auswertet; statisch auf GitHub Pages gehostet.

**Architecture:** Statische SPA (Vite + TypeScript, Vanilla) mit Hash-Routing. Reine Quiz-Logik netzwerkfrei und unit-getestet. Spotify-Anbindung per OAuth PKCE + Web-API/Connect (Fernsteuerung der Spotify-App als aktives Gerät). Kein Backend.

**Tech Stack:** Vite, TypeScript, Zod (Validierung), Vitest (Unit), Playwright (E2E), GitHub Actions (Deploy).

## Global Constraints

- Node ≥ 20; Paketmanager: **npm** (v11 vorhanden). Kein pnpm/bun.
- Kein Backend, kein Client-Secret — OAuth ausschließlich **Authorization Code + PKCE**.
- Keine Spotify-Zugangsdaten speichern; kein Tracking/Analytics; keine unnötigen personenbezogenen Daten.
- Clip-Länge fest: **5000 ms**. Eingabe-Regex fest: `^[1-9][0-9]{0,2}$`.
- Modi: `'start'` (nach Intro) und `'random'` (zufällige Mitte). Auswahl persistent in `localStorage`.
- Zwei Rückmeldungstexte wörtlich: Richtig → `"Richtig!\nFolge {nummer} – {titel}"`; Falsch → `"Leider nicht richtig. Versuch es beim nächsten Mal!\nGesucht war Folge {nummer} – {titel}."`
- Look & Feel: dunkler Hintergrund, Akzente Rot/Weiß, hoher Kontrast, `prefers-reduced-motion` respektieren; keine geschützten Originalgrafiken.
- `data/folgen.json` wird beim Laden per Zod validiert. GitHub Pages: Vite `base` muss auf Repo-Namen gesetzt werden.
- Die globale `~/.gitignore` ignoriert `docs/superpowers` — Plan/Spec-Dateien mit `git add -f` committen.

---

### Task 1: Projekt-Scaffolding (Vite + TS + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/types.ts`, `.gitignore`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: `src/types.ts` mit gemeinsamen Typen:
  ```ts
  export type Mode = 'start' | 'random'
  export interface Folge { nummer: number; titel: string; albumId: string; introEndMs?: number }
  export interface FolgenData { defaultIntroEndMs: number; folgen: Folge[] }
  export interface Track { uri: string; durationMs: number }
  export interface ClipPosition { trackUri: string; positionMs: number }
  export const CLIP_MS = 5000
  ```

- [ ] **Step 1: package.json anlegen**

```json
{
  "name": "hoerspiel-quiz",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "e2e": "playwright test"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0"
  },
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: tsconfig.json anlegen**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: vite.config.ts anlegen** (base = Repo-Name für GitHub Pages)

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/hoerspiel-quiz/',
  test: { globals: true, environment: 'jsdom' },
})
```

- [ ] **Step 4: index.html + src/main.ts + src/types.ts + .gitignore anlegen**

`index.html`:
```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>??? Hörspiel-Quiz</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/types.ts`: (Inhalt aus Interfaces oben — exakt übernehmen)

`src/main.ts`:
```ts
const app = document.querySelector<HTMLDivElement>('#app')!
app.textContent = '??? Hörspiel-Quiz'
```

`.gitignore`:
```
node_modules
dist
coverage
test-results
playwright-report
```

- [ ] **Step 5: Smoke-Test schreiben** — `tests/smoke.test.ts`

```ts
import { CLIP_MS } from '../src/types'

test('CLIP_MS ist 5000', () => {
  expect(CLIP_MS).toBe(5000)
})
```

- [ ] **Step 6: Installieren, Test und Build prüfen**

Run: `npm install && npm test && npm run build`
Expected: Test PASS; Build erzeugt `dist/` ohne Fehler.

- [ ] **Step 7: jsdom + Coverage-Deps nachziehen (falls Test env fehlt)**

Run: `npm install -D jsdom`
Expected: install ok.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TS + Vitest project"
```

---

### Task 2: Folgen-Daten + Zod-Loader

**Files:**
- Create: `src/data/folgen.json`, `src/data/folgenSchema.ts`, `tests/folgenSchema.test.ts`

**Interfaces:**
- Consumes: `FolgenData`, `Folge` aus `src/types.ts`.
- Produces: `parseFolgenData(input: unknown): FolgenData` — wirft `ZodError` bei ungültiger Struktur.

- [ ] **Step 1: Failing test schreiben** — `tests/folgenSchema.test.ts`

```ts
import { parseFolgenData } from '../src/data/folgenSchema'

test('akzeptiert gültige Folgendaten', () => {
  const data = parseFolgenData({
    defaultIntroEndMs: 35000,
    folgen: [{ nummer: 125, titel: 'Feuermond', albumId: 'abc' }],
  })
  expect(data.folgen[0].nummer).toBe(125)
})

test('lehnt Folge ohne albumId ab', () => {
  expect(() => parseFolgenData({ defaultIntroEndMs: 35000, folgen: [{ nummer: 1, titel: 'X' }] })).toThrow()
})

test('lehnt nummer < 1 ab', () => {
  expect(() => parseFolgenData({ defaultIntroEndMs: 35000, folgen: [{ nummer: 0, titel: 'X', albumId: 'a' }] })).toThrow()
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- folgenSchema`
Expected: FAIL („parseFolgenData is not a function" / Modul fehlt).

- [ ] **Step 3: Schema implementieren** — `src/data/folgenSchema.ts`

```ts
import { z } from 'zod'
import type { FolgenData } from '../types'

const folgeSchema = z.object({
  nummer: z.number().int().min(1).max(999),
  titel: z.string().min(1),
  albumId: z.string().min(1),
  introEndMs: z.number().int().min(0).optional(),
})

const folgenDataSchema = z.object({
  defaultIntroEndMs: z.number().int().min(0),
  folgen: z.array(folgeSchema).min(1),
})

export function parseFolgenData(input: unknown): FolgenData {
  return folgenDataSchema.parse(input)
}
```

- [ ] **Step 4: Beispiel-Daten anlegen** — `src/data/folgen.json`

```json
{
  "defaultIntroEndMs": 35000,
  "folgen": [
    { "nummer": 125, "titel": "Feuermond", "albumId": "PLATZHALTER_ALBUM_ID" },
    { "nummer": 124, "titel": "Gefährliches Quiz", "albumId": "PLATZHALTER_ALBUM_ID" }
  ]
}
```
Hinweis: Album-IDs sind Platzhalter und müssen später mit echten Spotify-Album-IDs befüllt werden.

- [ ] **Step 5: Test läuft grün**

Run: `npm test -- folgenSchema`
Expected: PASS (3 Tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add folgen data model with zod validation"
```

---

### Task 3: Eingabe-Validierung

**Files:**
- Create: `src/quiz/validateGuess.ts`, `tests/validateGuess.test.ts`

**Interfaces:**
- Produces: `validateGuess(raw: string): { valid: true; value: number } | { valid: false; error: string }`

- [ ] **Step 1: Failing test schreiben** — `tests/validateGuess.test.ts`

```ts
import { validateGuess } from '../src/quiz/validateGuess'

test('akzeptiert 1-3 Ziffern >= 1', () => {
  expect(validateGuess('1')).toEqual({ valid: true, value: 1 })
  expect(validateGuess('125')).toEqual({ valid: true, value: 125 })
})

test.each(['0', '007', '-5', '12.5', '1a', '', 'abc', '1234'])('lehnt ungültige Eingabe "%s" ab', (input) => {
  const r = validateGuess(input)
  expect(r.valid).toBe(false)
})

test('liefert verständliche Fehlermeldung', () => {
  const r = validateGuess('abc')
  expect(r.valid).toBe(false)
  if (!r.valid) expect(r.error).toMatch(/Zahl/i)
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- validateGuess`
Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren** — `src/quiz/validateGuess.ts`

```ts
const GUESS_RE = /^[1-9][0-9]{0,2}$/

export type GuessResult =
  | { valid: true; value: number }
  | { valid: false; error: string }

export function validateGuess(raw: string): GuessResult {
  const trimmed = raw.trim()
  if (!GUESS_RE.test(trimmed)) {
    return { valid: false, error: 'Bitte gib eine ganze Zahl von 1 bis 999 ein.' }
  }
  return { valid: true, value: Number(trimmed) }
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- validateGuess`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add guess input validation"
```

---

### Task 4: Quiz-Logik — Folgenauswahl & Auswertung

**Files:**
- Create: `src/quiz/quizLogic.ts`, `tests/quizLogic.test.ts`

**Interfaces:**
- Consumes: `Folge` aus `src/types.ts`.
- Produces:
  - `pickRandomFolge(folgen: Folge[], rng?: () => number): Folge`
  - `evaluateAnswer(guess: number, folge: Folge): { correct: boolean; message: string }`

- [ ] **Step 1: Failing test schreiben** — `tests/quizLogic.test.ts`

```ts
import { pickRandomFolge, evaluateAnswer } from '../src/quiz/quizLogic'
import type { Folge } from '../src/types'

const folgen: Folge[] = [
  { nummer: 1, titel: 'A', albumId: 'a' },
  { nummer: 2, titel: 'B', albumId: 'b' },
]

test('pickRandomFolge wählt anhand rng', () => {
  expect(pickRandomFolge(folgen, () => 0).nummer).toBe(1)
  expect(pickRandomFolge(folgen, () => 0.99).nummer).toBe(2)
})

test('evaluateAnswer korrekt', () => {
  const r = evaluateAnswer(125, { nummer: 125, titel: 'Feuermond', albumId: 'x' })
  expect(r.correct).toBe(true)
  expect(r.message).toBe('Richtig!\nFolge 125 – Feuermond')
})

test('evaluateAnswer falsch', () => {
  const r = evaluateAnswer(1, { nummer: 125, titel: 'Feuermond', albumId: 'x' })
  expect(r.correct).toBe(false)
  expect(r.message).toBe('Leider nicht richtig. Versuch es beim nächsten Mal!\nGesucht war Folge 125 – Feuermond.')
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- quizLogic`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/quiz/quizLogic.ts`

```ts
import type { Folge } from '../types'

export function pickRandomFolge(folgen: Folge[], rng: () => number = Math.random): Folge {
  const index = Math.floor(rng() * folgen.length)
  return folgen[Math.min(index, folgen.length - 1)]
}

export function evaluateAnswer(guess: number, folge: Folge): { correct: boolean; message: string } {
  const correct = guess === folge.nummer
  const message = correct
    ? `Richtig!\nFolge ${folge.nummer} – ${folge.titel}`
    : `Leider nicht richtig. Versuch es beim nächsten Mal!\nGesucht war Folge ${folge.nummer} – ${folge.titel}.`
  return { correct, message }
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- quizLogic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add folge selection and answer evaluation"
```

---

### Task 5: Quiz-Logik — Clip-Position berechnen

**Files:**
- Create: `src/quiz/computeClip.ts`, `tests/computeClip.test.ts`

**Interfaces:**
- Consumes: `Folge`, `Track`, `ClipPosition`, `CLIP_MS`, `Mode` aus `src/types.ts`.
- Produces: `computeClip(args: { mode: Mode; folge: Folge; tracks: Track[]; defaultIntroEndMs: number; rng?: () => number }): ClipPosition`

Regeln:
- `mode 'start'`: Track 0, `positionMs = folge.introEndMs ?? defaultIntroEndMs`, geklemmt auf `[0, durationMs - CLIP_MS]`.
- `mode 'random'`: zufälliger Track aus mittlerem Bereich (Index 1..len-2; bei < 3 Tracks Fallback auf Track 0), `positionMs` zufällig in `[0, durationMs - CLIP_MS]` geklemmt.

- [ ] **Step 1: Failing test schreiben** — `tests/computeClip.test.ts`

```ts
import { computeClip } from '../src/quiz/computeClip'
import type { Track, Folge } from '../src/types'

const folge: Folge = { nummer: 1, titel: 'A', albumId: 'a', introEndMs: 30000 }
const tracks: Track[] = [
  { uri: 't0', durationMs: 120000 },
  { uri: 't1', durationMs: 60000 },
  { uri: 't2', durationMs: 60000 },
  { uri: 't3', durationMs: 60000 },
]

test('start: Track 0 an introEndMs', () => {
  const clip = computeClip({ mode: 'start', folge, tracks, defaultIntroEndMs: 35000 })
  expect(clip).toEqual({ trackUri: 't0', positionMs: 30000 })
})

test('start: nutzt default wenn kein introEndMs', () => {
  const clip = computeClip({ mode: 'start', folge: { ...folge, introEndMs: undefined }, tracks, defaultIntroEndMs: 35000 })
  expect(clip.positionMs).toBe(35000)
})

test('start: klemmt, wenn intro länger als Track', () => {
  const clip = computeClip({ mode: 'start', folge: { ...folge, introEndMs: 200000 }, tracks, defaultIntroEndMs: 35000 })
  expect(clip.positionMs).toBe(120000 - 5000)
})

test('random: wählt mittleren Track, nie ersten/letzten', () => {
  const clip = computeClip({ mode: 'random', folge, tracks, defaultIntroEndMs: 35000, rng: () => 0 })
  expect(clip.trackUri).toBe('t1')
  expect(clip.positionMs).toBe(0)
})

test('random: Position lässt 5s Platz', () => {
  const clip = computeClip({ mode: 'random', folge, tracks, defaultIntroEndMs: 35000, rng: () => 0.999 })
  expect(clip.positionMs).toBeLessThanOrEqual(60000 - 5000)
})

test('random: Fallback auf Track 0 bei < 3 Tracks', () => {
  const clip = computeClip({ mode: 'random', folge, tracks: [tracks[0], tracks[1]], defaultIntroEndMs: 35000, rng: () => 0 })
  expect(clip.trackUri).toBe('t0')
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- computeClip`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/quiz/computeClip.ts`

```ts
import { CLIP_MS, type ClipPosition, type Folge, type Mode, type Track } from '../types'

interface ComputeClipArgs {
  mode: Mode
  folge: Folge
  tracks: Track[]
  defaultIntroEndMs: number
  rng?: () => number
}

const clampPosition = (positionMs: number, durationMs: number): number =>
  Math.max(0, Math.min(positionMs, Math.max(0, durationMs - CLIP_MS)))

export function computeClip({ mode, folge, tracks, defaultIntroEndMs, rng = Math.random }: ComputeClipArgs): ClipPosition {
  if (mode === 'start') {
    const track = tracks[0]
    const intro = folge.introEndMs ?? defaultIntroEndMs
    return { trackUri: track.uri, positionMs: clampPosition(intro, track.durationMs) }
  }

  const hasMiddle = tracks.length >= 3
  const startIdx = hasMiddle ? 1 : 0
  const endIdx = hasMiddle ? tracks.length - 2 : 0
  const span = endIdx - startIdx + 1
  const trackIdx = startIdx + Math.min(Math.floor(rng() * span), span - 1)
  const track = tracks[trackIdx]
  const maxPos = Math.max(0, track.durationMs - CLIP_MS)
  const positionMs = clampPosition(Math.floor(rng() * maxPos), track.durationMs)
  return { trackUri: track.uri, positionMs }
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- computeClip`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add clip position calculation for both modes"
```

---

### Task 6: Settings-State (localStorage)

**Files:**
- Create: `src/state/settings.ts`, `tests/settings.test.ts`

**Interfaces:**
- Consumes: `Mode` aus `src/types.ts`.
- Produces: `getMode(): Mode`, `setMode(mode: Mode): void` (Default `'start'`, Key `hq.mode`).

- [ ] **Step 1: Failing test schreiben** — `tests/settings.test.ts`

```ts
import { getMode, setMode } from '../src/state/settings'

beforeEach(() => localStorage.clear())

test('Default ist start', () => {
  expect(getMode()).toBe('start')
})

test('setMode persistiert', () => {
  setMode('random')
  expect(getMode()).toBe('random')
})

test('ungültiger gespeicherter Wert -> Default', () => {
  localStorage.setItem('hq.mode', 'müll')
  expect(getMode()).toBe('start')
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- settings`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/state/settings.ts`

```ts
import type { Mode } from '../types'

const KEY = 'hq.mode'

export function getMode(): Mode {
  const value = localStorage.getItem(KEY)
  return value === 'random' || value === 'start' ? value : 'start'
}

export function setMode(mode: Mode): void {
  localStorage.setItem(KEY, mode)
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- settings`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add persistent mode settings"
```

---

### Task 7: Spotify OAuth (PKCE-Helfer)

**Files:**
- Create: `src/auth/pkce.ts`, `tests/pkce.test.ts`

**Interfaces:**
- Produces:
  - `generateCodeVerifier(randomBytes?: (n: number) => Uint8Array): string`
  - `codeChallenge(verifier: string): Promise<string>` (SHA-256, base64url)
  - `buildAuthUrl(cfg: { clientId: string; redirectUri: string; scopes: string[] }, verifier: string): Promise<string>`

Scopes fest: `['user-read-playback-state', 'user-modify-playback-state']`.

- [ ] **Step 1: Failing test schreiben** — `tests/pkce.test.ts`

```ts
import { generateCodeVerifier, codeChallenge, buildAuthUrl } from '../src/auth/pkce'

test('verifier ist base64url, 43-128 Zeichen', () => {
  const v = generateCodeVerifier()
  expect(v).toMatch(/^[A-Za-z0-9\-_]{43,128}$/)
})

test('challenge ist deterministisch für gleichen verifier', async () => {
  const a = await codeChallenge('teststring-teststring-teststring-teststring')
  const b = await codeChallenge('teststring-teststring-teststring-teststring')
  expect(a).toBe(b)
  expect(a).toMatch(/^[A-Za-z0-9\-_]+$/)
})

test('buildAuthUrl enthält Pflichtparameter', async () => {
  const url = await buildAuthUrl(
    { clientId: 'CID', redirectUri: 'https://ex.org/cb', scopes: ['a', 'b'] },
    'teststring-teststring-teststring-teststring',
  )
  const u = new URL(url)
  expect(u.origin + u.pathname).toBe('https://accounts.spotify.com/authorize')
  expect(u.searchParams.get('client_id')).toBe('CID')
  expect(u.searchParams.get('code_challenge_method')).toBe('S256')
  expect(u.searchParams.get('response_type')).toBe('code')
  expect(u.searchParams.get('scope')).toBe('a b')
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- pkce`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/auth/pkce.ts`

```ts
const toBase64Url = (bytes: Uint8Array): string => {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateCodeVerifier(
  randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  return toBase64Url(randomBytes(48))
}

export async function codeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toBase64Url(new Uint8Array(digest))
}

export async function buildAuthUrl(
  cfg: { clientId: string; redirectUri: string; scopes: string[] },
  verifier: string,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: cfg.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    scope: cfg.scopes.join(' '),
  })
  return `https://accounts.spotify.com/authorize?${params.toString()}`
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- pkce`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PKCE helpers for spotify oauth"
```

---

### Task 8: Auth-Flow-Orchestrierung (Token-Handling)

**Files:**
- Create: `src/auth/spotifyAuth.ts`, `tests/spotifyAuth.test.ts`

**Interfaces:**
- Consumes: `generateCodeVerifier`, `buildAuthUrl` aus `src/auth/pkce.ts`.
- Produces:
  - `getAccessToken(): string | null` (aus `sessionStorage`, null wenn abgelaufen/fehlt)
  - `exchangeCodeForToken(code: string, cfg): Promise<void>` (POST an Spotify Token-Endpoint, speichert Token + Ablaufzeit in `sessionStorage`)
  - `beginLogin(cfg): Promise<void>` (verifier erzeugen, in sessionStorage ablegen, `location.assign(authUrl)`)
  - Config-Konstante `SPOTIFY_CONFIG = { clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID, redirectUri: <origin+base>, scopes: [...] }`

- [ ] **Step 1: Failing test schreiben** — `tests/spotifyAuth.test.ts`

```ts
import { getAccessToken, exchangeCodeForToken } from '../src/auth/spotifyAuth'

beforeEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

test('getAccessToken: null ohne Token', () => {
  expect(getAccessToken()).toBeNull()
})

test('exchangeCodeForToken speichert Token', async () => {
  sessionStorage.setItem('hq.verifier', 'v-teststring-teststring-teststring-xx')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify({ access_token: 'TOK', expires_in: 3600 }),
    { status: 200 },
  )))
  await exchangeCodeForToken('code123', { clientId: 'CID', redirectUri: 'https://ex.org/cb', scopes: [] })
  expect(getAccessToken()).toBe('TOK')
})

test('getAccessToken: null nach Ablauf', () => {
  sessionStorage.setItem('hq.token', 'TOK')
  sessionStorage.setItem('hq.expires', String(Date.now() - 1000))
  expect(getAccessToken()).toBeNull()
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- spotifyAuth`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/auth/spotifyAuth.ts`

```ts
import { buildAuthUrl, generateCodeVerifier } from './pkce'

export interface AuthConfig { clientId: string; redirectUri: string; scopes: string[] }

const T_KEY = 'hq.token'
const E_KEY = 'hq.expires'
const V_KEY = 'hq.verifier'

export const SPOTIFY_CONFIG: AuthConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '',
  redirectUri: `${location.origin}${import.meta.env.BASE_URL}`,
  scopes: ['user-read-playback-state', 'user-modify-playback-state'],
}

export function getAccessToken(): string | null {
  const token = sessionStorage.getItem(T_KEY)
  const expires = Number(sessionStorage.getItem(E_KEY) ?? 0)
  if (!token || Date.now() >= expires) return null
  return token
}

export async function beginLogin(cfg: AuthConfig): Promise<void> {
  const verifier = generateCodeVerifier()
  sessionStorage.setItem(V_KEY, verifier)
  location.assign(await buildAuthUrl(cfg, verifier))
}

export async function exchangeCodeForToken(code: string, cfg: AuthConfig): Promise<void> {
  const verifier = sessionStorage.getItem(V_KEY) ?? ''
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    code_verifier: verifier,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error('Token-Austausch fehlgeschlagen')
  const data = (await res.json()) as { access_token: string; expires_in: number }
  sessionStorage.setItem(T_KEY, data.access_token)
  sessionStorage.setItem(E_KEY, String(Date.now() + data.expires_in * 1000))
  sessionStorage.removeItem(V_KEY)
}
```

Hinweis: `import.meta.env.VITE_SPOTIFY_CLIENT_ID` wird beim Build gesetzt (siehe Task 12). In Tests wird nur `exchangeCodeForToken`/`getAccessToken` mit expliziter Config genutzt.

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- spotifyAuth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add spotify oauth token handling"
```

---

### Task 9: Spotify-API-Client

**Files:**
- Create: `src/spotify/client.ts`, `tests/client.test.ts`

**Interfaces:**
- Consumes: `Track` aus `src/types.ts`.
- Produces (alle nehmen `token: string`):
  - `getAlbumTracks(albumId: string, token: string): Promise<Track[]>`
  - `getActiveDeviceId(token: string): Promise<string | null>`
  - `playClipRequest(token: string, opts: { deviceId: string; uris: string[]; positionMs: number }): Promise<void>`
  - `pausePlayback(token: string, deviceId: string): Promise<void>`
  - Fehlerklasse `class NoActiveDeviceError extends Error {}`

- [ ] **Step 1: Failing test schreiben** — `tests/client.test.ts`

```ts
import { getAlbumTracks, getActiveDeviceId } from '../src/spotify/client'

beforeEach(() => vi.restoreAllMocks())

test('getAlbumTracks mappt uri+durationMs', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    items: [{ uri: 'spotify:track:1', duration_ms: 60000 }],
  }), { status: 200 })))
  const tracks = await getAlbumTracks('album1', 'TOK')
  expect(tracks).toEqual([{ uri: 'spotify:track:1', durationMs: 60000 }])
})

test('getActiveDeviceId gibt aktives Gerät zurück', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    devices: [{ id: 'dev1', is_active: false }, { id: 'dev2', is_active: true }],
  }), { status: 200 })))
  expect(await getActiveDeviceId('TOK')).toBe('dev2')
})

test('getActiveDeviceId: null ohne Gerät', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ devices: [] }), { status: 200 })))
  expect(await getActiveDeviceId('TOK')).toBeNull()
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- client`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/spotify/client.ts`

```ts
import type { Track } from '../types'

const API = 'https://api.spotify.com/v1'

export class NoActiveDeviceError extends Error {
  constructor() {
    super('Kein aktives Spotify-Gerät gefunden.')
  }
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function getAlbumTracks(albumId: string, token: string): Promise<Track[]> {
  const res = await fetch(`${API}/albums/${albumId}/tracks?limit=50`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`Album-Tracks laden fehlgeschlagen (${res.status})`)
  const data = (await res.json()) as { items: Array<{ uri: string; duration_ms: number }> }
  return data.items.map((t) => ({ uri: t.uri, durationMs: t.duration_ms }))
}

export async function getActiveDeviceId(token: string): Promise<string | null> {
  const res = await fetch(`${API}/me/player/devices`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`Geräte laden fehlgeschlagen (${res.status})`)
  const data = (await res.json()) as { devices: Array<{ id: string; is_active: boolean }> }
  const active = data.devices.find((d) => d.is_active) ?? data.devices[0]
  return active?.id ?? null
}

export async function playClipRequest(
  token: string,
  opts: { deviceId: string; uris: string[]; positionMs: number },
): Promise<void> {
  const res = await fetch(`${API}/me/player/play?device_id=${opts.deviceId}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: opts.uris, position_ms: opts.positionMs }),
  })
  if (!res.ok) throw new Error(`Wiedergabe fehlgeschlagen (${res.status})`)
}

export async function pausePlayback(token: string, deviceId: string): Promise<void> {
  await fetch(`${API}/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT',
    headers: authHeaders(token),
  })
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add spotify web api client"
```

---

### Task 10: Playback-Controller (5-Sek-Timer)

**Files:**
- Create: `src/spotify/playback.ts`, `tests/playback.test.ts`

**Interfaces:**
- Consumes: `getActiveDeviceId`, `playClipRequest`, `pausePlayback`, `NoActiveDeviceError` aus `client.ts`; `ClipPosition`, `CLIP_MS` aus `types.ts`.
- Produces: `playClip(token: string, clip: ClipPosition, deps?: Partial<PlaybackDeps>): Promise<void>` — holt aktives Gerät (wirft `NoActiveDeviceError` wenn keins), startet Wiedergabe, pausiert nach `CLIP_MS`. `deps` erlaubt Injektion für Tests (inkl. `wait`).

- [ ] **Step 1: Failing test schreiben** — `tests/playback.test.ts`

```ts
import { playClip } from '../src/spotify/playback'
import { NoActiveDeviceError } from '../src/spotify/client'

test('spielt und pausiert nach CLIP_MS', async () => {
  const calls: string[] = []
  await playClip('TOK', { trackUri: 't1', positionMs: 1000 }, {
    getActiveDeviceId: async () => 'dev1',
    playClipRequest: async () => { calls.push('play') },
    pausePlayback: async () => { calls.push('pause') },
    wait: async () => { calls.push('wait') },
  })
  expect(calls).toEqual(['play', 'wait', 'pause'])
})

test('wirft NoActiveDeviceError ohne Gerät', async () => {
  await expect(playClip('TOK', { trackUri: 't1', positionMs: 0 }, {
    getActiveDeviceId: async () => null,
  })).rejects.toBeInstanceOf(NoActiveDeviceError)
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- playback`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/spotify/playback.ts`

```ts
import { CLIP_MS, type ClipPosition } from '../types'
import {
  NoActiveDeviceError,
  getActiveDeviceId as realGetDevice,
  pausePlayback as realPause,
  playClipRequest as realPlay,
} from './client'

export interface PlaybackDeps {
  getActiveDeviceId: (token: string) => Promise<string | null>
  playClipRequest: (token: string, opts: { deviceId: string; uris: string[]; positionMs: number }) => Promise<void>
  pausePlayback: (token: string, deviceId: string) => Promise<void>
  wait: (ms: number) => Promise<void>
}

const defaultDeps: PlaybackDeps = {
  getActiveDeviceId: realGetDevice,
  playClipRequest: realPlay,
  pausePlayback: realPause,
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
}

export async function playClip(token: string, clip: ClipPosition, deps: Partial<PlaybackDeps> = {}): Promise<void> {
  const d = { ...defaultDeps, ...deps }
  const deviceId = await d.getActiveDeviceId(token)
  if (!deviceId) throw new NoActiveDeviceError()
  await d.playClipRequest(token, { deviceId, uris: [clip.trackUri], positionMs: clip.positionMs })
  await d.wait(CLIP_MS)
  await d.pausePlayback(token, deviceId)
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- playback`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add 5-second clip playback controller"
```

---

### Task 11: Round-Orchestrator (Quiz-Runde zusammensetzen)

**Files:**
- Create: `src/quiz/round.ts`, `tests/round.test.ts`

**Interfaces:**
- Consumes: `parseFolgenData`, `pickRandomFolge`, `computeClip`, `getAlbumTracks`, `playClip`, `getMode`, `evaluateAnswer`.
- Produces:
  - `startRound(deps): Promise<{ folge: Folge; clip: ClipPosition; play: () => Promise<void> }>` — wählt Folge, lädt Album-Tracks (mit Session-Cache), berechnet Clip, liefert `play`-Funktion.
  - Track-Cache `Map<albumId, Track[]>` modul-intern.

- [ ] **Step 1: Failing test schreiben** — `tests/round.test.ts`

```ts
import { startRound } from '../src/quiz/round'
import type { Folge, Track } from '../src/types'

const folgen: Folge[] = [{ nummer: 5, titel: 'X', albumId: 'alb', introEndMs: 10000 }]
const tracks: Track[] = [{ uri: 't0', durationMs: 60000 }]

test('startRound liefert Folge + Clip + play', async () => {
  let played = false
  const round = await startRound({
    folgen,
    defaultIntroEndMs: 35000,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async () => tracks,
    playClip: async () => { played = true },
    rng: () => 0,
  })
  expect(round.folge.nummer).toBe(5)
  expect(round.clip.trackUri).toBe('t0')
  await round.play()
  expect(played).toBe(true)
})
```

- [ ] **Step 2: Test läuft rot**

Run: `npm test -- round`
Expected: FAIL.

- [ ] **Step 3: Implementieren** — `src/quiz/round.ts`

```ts
import type { ClipPosition, Folge, Mode, Track } from '../types'
import { computeClip } from './computeClip'
import { pickRandomFolge } from './quizLogic'

export interface StartRoundDeps {
  folgen: Folge[]
  defaultIntroEndMs: number
  mode: Mode
  token: string
  getAlbumTracks: (albumId: string, token: string) => Promise<Track[]>
  playClip: (token: string, clip: ClipPosition) => Promise<void>
  rng?: () => number
}

export interface Round {
  folge: Folge
  clip: ClipPosition
  play: () => Promise<void>
}

const trackCache = new Map<string, Track[]>()

export async function startRound(deps: StartRoundDeps): Promise<Round> {
  const folge = pickRandomFolge(deps.folgen, deps.rng)
  let tracks = trackCache.get(folge.albumId)
  if (!tracks) {
    tracks = await deps.getAlbumTracks(folge.albumId, deps.token)
    trackCache.set(folge.albumId, tracks)
  }
  const clip = computeClip({
    mode: deps.mode,
    folge,
    tracks,
    defaultIntroEndMs: deps.defaultIntroEndMs,
    rng: deps.rng,
  })
  return { folge, clip, play: () => deps.playClip(deps.token, clip) }
}
```

- [ ] **Step 4: Test läuft grün**

Run: `npm test -- round`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add quiz round orchestrator with track cache"
```

---

### Task 12: UI — Screens, Router, Feedback, Styling

**Files:**
- Create: `src/ui/render.ts`, `src/ui/app.ts`, `src/styles.css`, `.env.example`
- Modify: `src/main.ts`, `index.html`

**Interfaces:**
- Consumes: alles aus `auth/`, `spotify/`, `quiz/`, `state/`, `data/`.
- Produces: `mountApp(root: HTMLElement): void` — initialisiert Router (`#/`, `#/quiz`, `#/settings`), verarbeitet OAuth-Redirect (`?code=`), rendert Screens und Feedback-Zustände.

Dies ist überwiegend DOM-Arbeit; Verifikation manuell im Browser (kein Unit-TDD, dafür E2E in Task 13).

- [ ] **Step 1: Styling anlegen** — `src/styles.css`

```css
:root {
  --bg: #0d0d0f;
  --surface: #1a1a1f;
  --accent: #d10a11;
  --text: #f5f5f5;
  --muted: #9a9aa2;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
  min-height: 100dvh;
}
#app { max-width: 480px; margin: 0 auto; padding: 24px 20px; }
h1 { color: var(--accent); letter-spacing: 0.05em; }
button {
  width: 100%;
  min-height: 56px;
  font-size: 1.15rem;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
}
button.secondary { background: var(--surface); color: var(--text); }
input[type="number"], input[inputmode="numeric"] {
  width: 100%;
  min-height: 56px;
  font-size: 1.5rem;
  text-align: center;
  border-radius: 12px;
  border: 2px solid var(--surface);
  background: var(--surface);
  color: var(--text);
}
.status { min-height: 1.5em; color: var(--muted); margin: 12px 0; }
.error { color: var(--accent); }
.result { white-space: pre-line; font-size: 1.25rem; margin: 16px 0; }
button:focus-visible, input:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.fade { transition: opacity 0.3s ease; }
@media (prefers-reduced-motion: reduce) { .fade { transition: none; } }
```

- [ ] **Step 2: Render-Helfer anlegen** — `src/ui/render.ts`

```ts
export function render(root: HTMLElement, html: string): void {
  root.innerHTML = html
}

export function setStatus(text: string, isError = false): void {
  const el = document.querySelector<HTMLDivElement>('#status')
  if (el) {
    el.textContent = text
    el.classList.toggle('error', isError)
  }
}
```

- [ ] **Step 3: App-Logik anlegen** — `src/ui/app.ts`

```ts
import folgenJson from '../data/folgen.json'
import { parseFolgenData } from '../data/folgenSchema'
import { beginLogin, exchangeCodeForToken, getAccessToken, SPOTIFY_CONFIG } from '../auth/spotifyAuth'
import { getActiveDeviceId, getAlbumTracks, NoActiveDeviceError } from '../spotify/client'
import { playClip as realPlayClip } from '../spotify/playback'
import { startRound, type Round } from '../quiz/round'
import { evaluateAnswer } from '../quiz/quizLogic'
import { validateGuess } from '../quiz/validateGuess'
import { getMode, setMode } from '../state/settings'
import { render, setStatus } from './render'

const data = parseFolgenData(folgenJson)
let root: HTMLElement
let current: Round | null = null

export function mountApp(el: HTMLElement): void {
  root = el
  handleRedirect().then(route)
  window.addEventListener('hashchange', route)
}

async function handleRedirect(): Promise<void> {
  const params = new URLSearchParams(location.search)
  const code = params.get('code')
  if (code) {
    try {
      await exchangeCodeForToken(code, SPOTIFY_CONFIG)
    } finally {
      history.replaceState({}, '', import.meta.env.BASE_URL)
    }
  }
}

function route(): void {
  const hash = location.hash || '#/'
  if (hash.startsWith('#/settings')) return renderSettings()
  if (hash.startsWith('#/quiz')) return void renderQuiz()
  return renderStart()
}

function renderStart(): void {
  render(root, `
    <h1>??? Hörspiel-Quiz</h1>
    <p>Errate die Folge am 5-Sekunden-Ausschnitt.</p>
    <button id="start">Neues Quiz</button>
    <button class="secondary" id="settings">Einstellungen</button>
    <div id="status" class="status"></div>
  `)
  root.querySelector('#settings')!.addEventListener('click', () => (location.hash = '#/settings'))
  root.querySelector('#start')!.addEventListener('click', () => {
    if (!getAccessToken()) return void beginLogin(SPOTIFY_CONFIG)
    location.hash = '#/quiz'
  })
}

function renderSettings(): void {
  const mode = getMode()
  render(root, `
    <h1>Einstellungen</h1>
    <label><input type="radio" name="mode" value="start" ${mode === 'start' ? 'checked' : ''}/> Folgenbeginn (nach Intro)</label><br/>
    <label><input type="radio" name="mode" value="random" ${mode === 'random' ? 'checked' : ''}/> Zufälliger Ausschnitt</label>
    <button class="secondary" id="back">Zurück</button>
  `)
  root.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((r) =>
    r.addEventListener('change', () => setMode(r.value as 'start' | 'random')),
  )
  root.querySelector('#back')!.addEventListener('click', () => (location.hash = '#/'))
}

async function renderQuiz(): Promise<void> {
  const token = getAccessToken()
  if (!token) return void (location.hash = '#/')
  render(root, `
    <h1>Welche Folge?</h1>
    <button id="play">▶ Ausschnitt abspielen</button>
    <input inputmode="numeric" maxlength="3" id="guess" placeholder="Folgennummer" />
    <button id="check">Antwort prüfen</button>
    <div id="status" class="status"></div>
  `)
  setStatus('Lade Ausschnitt …')
  try {
    current = await startRound({
      folgen: data.folgen,
      defaultIntroEndMs: data.defaultIntroEndMs,
      mode: getMode(),
      token,
      getAlbumTracks,
      playClip: realPlayClip,
    })
    setStatus('Bereit. Tippe auf Abspielen.')
  } catch {
    setStatus('Konnte Folge nicht laden.', true)
    return
  }

  root.querySelector('#play')!.addEventListener('click', playCurrent)
  root.querySelector('#check')!.addEventListener('click', checkAnswer)
}

async function playCurrent(): Promise<void> {
  if (!current) return
  setStatus('Wiedergabe läuft …')
  try {
    await current.play()
    setStatus('Fertig. Deine Antwort?')
  } catch (e) {
    setStatus(e instanceof NoActiveDeviceError
      ? 'Bitte öffne die Spotify-App auf deinem Handy.'
      : 'Wiedergabe fehlgeschlagen.', true)
  }
}

function checkAnswer(): void {
  if (!current) return
  const raw = root.querySelector<HTMLInputElement>('#guess')!.value
  const result = validateGuess(raw)
  if (!result.valid) return setStatus(result.error, true)
  const evalResult = evaluateAnswer(result.value, current.folge)
  renderResult(evalResult.message)
}

function renderResult(message: string): void {
  render(root, `
    <h1>Ergebnis</h1>
    <div class="result">${message}</div>
    <button id="next">Nächstes Quiz</button>
    <button class="secondary" id="home">Startseite</button>
  `)
  root.querySelector('#next')!.addEventListener('click', () => renderQuiz())
  root.querySelector('#home')!.addEventListener('click', () => (location.hash = '#/'))
}
```

- [ ] **Step 4: main.ts + .env.example verdrahten**

`src/main.ts`:
```ts
import './styles.css'
import { mountApp } from './ui/app'

mountApp(document.querySelector<HTMLDivElement>('#app')!)
```

`.env.example`:
```
VITE_SPOTIFY_CLIENT_ID=deine_spotify_client_id
```

- [ ] **Step 5: Typecheck + Build**

Run: `npm run build`
Expected: `tsc` ohne Fehler, `dist/` erzeugt.

- [ ] **Step 6: Manuelle Sichtprüfung (dev)**

Run: `npm run dev`
Expected: Startscreen dunkel, roter Titel, große Buttons; Navigation Start → Einstellungen funktioniert. (Spotify-Playback erst mit echter Client-ID/Album-IDs live.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add UI screens, router and dark theme"
```

---

### Task 13: E2E-Test (Playwright, gemocktes Spotify)

**Files:**
- Create: `playwright.config.ts`, `e2e/quiz.spec.ts`
- Modify: `package.json` (devDependency `@playwright/test`)

**Interfaces:**
- Testet kritischen Flow ohne echtes Spotify: Netzwerk zu `api.spotify.com` und `accounts.spotify.com` wird abgefangen; Token wird vorab in `sessionStorage` gelegt.

- [ ] **Step 1: Playwright installieren**

Run: `npm install -D @playwright/test && npx playwright install chromium`
Expected: install ok.

- [ ] **Step 2: playwright.config.ts anlegen**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  webServer: { command: 'npm run dev', url: 'http://localhost:5173/hoerspiel-quiz/', reuseExistingServer: true },
  use: { baseURL: 'http://localhost:5173/hoerspiel-quiz/' },
})
```

- [ ] **Step 3: E2E-Test schreiben** — `e2e/quiz.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('Quiz-Flow mit gemocktem Spotify', async ({ page }) => {
  await page.route('**/v1/albums/**/tracks**', (r) =>
    r.fulfill({ json: { items: [{ uri: 'spotify:track:1', duration_ms: 120000 }] } }))
  await page.route('**/v1/me/player/devices', (r) =>
    r.fulfill({ json: { devices: [{ id: 'dev1', is_active: true }] } }))
  await page.route('**/v1/me/player/play**', (r) => r.fulfill({ status: 204, body: '' }))
  await page.route('**/v1/me/player/pause**', (r) => r.fulfill({ status: 204, body: '' }))

  await page.goto('/')
  await page.evaluate(() => {
    sessionStorage.setItem('hq.token', 'TOK')
    sessionStorage.setItem('hq.expires', String(Date.now() + 3_600_000))
  })
  await page.goto('/#/quiz')

  await expect(page.locator('#play')).toBeVisible()
  await page.fill('#guess', '125')
  await page.click('#check')
  await expect(page.locator('.result')).toContainText('Folge 125')
})

test('ungültige Eingabe zeigt Fehler', async ({ page }) => {
  await page.route('**/v1/albums/**/tracks**', (r) =>
    r.fulfill({ json: { items: [{ uri: 'spotify:track:1', duration_ms: 120000 }] } }))
  await page.goto('/')
  await page.evaluate(() => {
    sessionStorage.setItem('hq.token', 'TOK')
    sessionStorage.setItem('hq.expires', String(Date.now() + 3_600_000))
  })
  await page.goto('/#/quiz')
  await page.fill('#guess', 'abc')
  await page.click('#check')
  await expect(page.locator('#status.error')).toContainText('ganze Zahl')
})
```

- [ ] **Step 4: E2E ausführen**

Run: `npm run e2e`
Expected: 2 Tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add playwright e2e for quiz flow"
```

---

### Task 14: GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Produces: CI-Workflow, der bei Push auf `main` baut und nach GitHub Pages deployed; `VITE_SPOTIFY_CLIENT_ID` aus Repository-Secret/Variable.

- [ ] **Step 1: Workflow anlegen** — `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          VITE_SPOTIFY_CLIENT_ID: ${{ vars.SPOTIFY_CLIENT_ID }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README schreiben** — `README.md`

Inhalt: Kurzbeschreibung; Setup (`npm install`, `.env` mit `VITE_SPOTIFY_CLIENT_ID`); Spotify-App im Dashboard anlegen mit Redirect-URI `https://<user>.github.io/hoerspiel-quiz/`; Hinweis Premium + geöffnete Spotify-App; Befehle `dev`/`build`/`test`/`e2e`; Pflege von `src/data/folgen.json` (echte Album-IDs, optional `introEndMs`); Repository-Variable `SPOTIFY_CLIENT_ID` setzen; GitHub Pages auf „GitHub Actions" stellen.

- [ ] **Step 3: Build final prüfen**

Run: `npm run build && npm test`
Expected: beides grün.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: add github pages deployment workflow"
```

---

## Offene Punkte für den Nutzer (nach Umsetzung)

- Echte Spotify-**Client-ID** anlegen (Spotify Developer Dashboard) und als Repo-Variable `SPOTIFY_CLIENT_ID` + lokal in `.env` hinterlegen.
- **Redirect-URI** im Spotify-Dashboard registrieren: `https://<user>.github.io/hoerspiel-quiz/`.
- `src/data/folgen.json` mit echten **Album-IDs** und Titeln befüllen; bei Bedarf `introEndMs` pro Folge feinjustieren.
- GitHub Repo `hoerspiel-quiz` anlegen; Pages-Quelle auf „GitHub Actions" stellen. (Falls Repo-Name abweicht, `base` in `vite.config.ts` anpassen.)
