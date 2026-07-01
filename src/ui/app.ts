import folgenJson from '../data/folgen.json'
import { parseFolgenData } from '../data/folgenSchema'
import { beginLogin, exchangeCodeForToken, getAccessToken, getSpotifyConfig } from '../auth/spotifyAuth'
import { getAlbumTracks, NoActiveDeviceError } from '../spotify/client'
import { playClip } from '../spotify/playback'
import { startRound, type Round } from '../quiz/round'
import { evaluateAnswer } from '../quiz/quizLogic'
import { positionToClip, scrub } from '../quiz/timeline'
import { validateGuess } from '../quiz/validateGuess'
import { getClientId, getMode, setClientId, setMode } from '../state/settings'
import { CLIP_MS } from '../types'
import { render, setStatus } from './render'

const data = parseFolgenData(folgenJson)
let root: HTMLElement
let current: Round | null = null
let lastAlbumId: string | null = null

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtml(value: string): string {
  return escapeAttr(value).replace(/>/g, '&gt;')
}

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
      await exchangeCodeForToken(code, getSpotifyConfig())
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

const HEADER = `
    <header class="hq-header">
      <div class="hq-titlebar">
        <span class="hq-mark" aria-hidden="true"><span>?</span><span>?</span><span>?</span></span>
        <h1 class="hq-title">Hörspiel-Quiz</h1>
      </div>
    </header>`

// Inline geometric icons (stroke-based, 2px). Decorative → aria-hidden.
const ICON_REWIND = (n: string) => `
  <svg class="scrub-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M12 5a7 7 0 1 1-6.9 8" stroke-linecap="round"/>
    <path d="M12 5 8.5 3M12 5 8.5 7.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="12" y="15.5" font-size="7" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">${n}</text>
  </svg>`
const ICON_FORWARD = (n: string) => `
  <svg class="scrub-icon" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M12 5a7 7 0 1 0 6.9 8" stroke-linecap="round"/>
    <path d="M12 5l3.5-2M12 5l3.5 2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="12" y="15.5" font-size="7" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif">${n}</text>
  </svg>`
const ICON_MAGNIFIER = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21" stroke-linecap="round"/>
  </svg>`
const ICON_GEAR = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="3.4"/>
    <path d="M12 1.5v3.2M12 19.3v3.2M1.5 12h3.2M19.3 12h3.2M4.4 4.4l2.3 2.3M17.3 17.3l2.3 2.3M19.6 4.4l-2.3 2.3M6.7 17.3l-2.3 2.3" stroke-linecap="round"/>
  </svg>`
const ICON_ARROW = `
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
const ICON_KEY = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="8" cy="8" r="4"/><path d="M10.8 10.8 20 20M17 17l2-2M15 15l2-2" stroke-linecap="round"/>
  </svg>`
const ICON_SLIDERS = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/>
    <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="2" fill="currentColor" stroke="none"/>
  </svg>`
const ICON_DB = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>
  </svg>`

function renderStart(): void {
  render(root, `
    ${HEADER}
    <div class="hq-hero-wrap">
      <div class="hq-hero" aria-hidden="true">
        <div class="hq-hero__lens">???</div>
      </div>
      <span class="hq-tag" aria-hidden="true">Fall: 001</span>
    </div>
    <p class="hq-sub">Untersuche die Fälle. Errate die Folge am 10-Sekunden-Ausschnitt.</p>
    <div class="stack">
      <button type="button" id="start">Neues Quiz ${ICON_ARROW}</button>
      <button type="button" class="secondary" id="settings">${ICON_GEAR} Einstellungen</button>
    </div>
    <div id="status" class="status" role="status" aria-live="polite"></div>
  `)
  root.querySelector('#settings')!.addEventListener('click', () => (location.hash = '#/settings'))
  root.querySelector('#start')!.addEventListener('click', () => {
    if (getAccessToken()) {
      location.hash = '#/quiz'
      return
    }
    if (getSpotifyConfig().clientId === '') {
      setStatus('Keine Spotify Client ID hinterlegt — bitte trage sie in den Einstellungen ein.', true)
      location.hash = '#/settings'
      return
    }
    void startLogin()
  })
}

async function startLogin(): Promise<void> {
  try {
    await beginLogin(getSpotifyConfig())
  } catch (e) {
    setStatus(e instanceof Error ? e.message : 'Login fehlgeschlagen.', true)
  }
}

function renderSettings(): void {
  const mode = getMode()
  render(root, `
    <h1 class="hq-screen-title">Einstellungen</h1>
    <div class="hq-hero-wrap">
      <div class="hq-hero hq-hero--gear" aria-hidden="true">
        <div class="hq-hero__lens">${ICON_GEAR}</div>
      </div>
    </div>
    <fieldset>
      <legend class="section-label">${ICON_SLIDERS} Quiz-Modus</legend>
      <label class="mode-card" for="mode-start">
        <input type="radio" id="mode-start" name="mode" value="start" ${mode === 'start' ? 'checked' : ''}/>
        <span class="mode-card__title">Folgenbeginn</span>
        <span class="mode-card__desc">Rate die Folge direkt nach dem Intro – mit den ±-Tasten feinjustieren.</span>
      </label>
      <label class="mode-card" for="mode-random">
        <input type="radio" id="mode-random" name="mode" value="random" ${mode === 'random' ? 'checked' : ''}/>
        <span class="mode-card__title">Zufällige Mitte</span>
        <span class="mode-card__desc">Eine zufällige Stelle aus der Mitte. Nur für echte Profis.</span>
      </label>
    </fieldset>
    <hr class="divider" />
    <div>
      <p class="section-label section-label--blue">${ICON_DB} API-Integration</p>
      <div class="field">
        <label for="client-id">Spotify Client ID</label>
        <input type="text" id="client-id" autocomplete="off" spellcheck="false" placeholder="Ex: 8f2a…88b2" value="${escapeAttr(getClientId())}" />
        <span class="field__icon" aria-hidden="true">${ICON_KEY}</span>
      </div>
      <p class="hint">Wird benötigt, um eine Verbindung zur Fall-Datenbank herzustellen. Deine ID wird lokal gespeichert. Du erhältst sie im <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer noopener">Spotify Developer Dashboard</a>. Trage dort als Redirect-URI <code>${location.origin}${import.meta.env.BASE_URL}</code> ein.</p>
    </div>
    <div id="status" class="status" role="status" aria-live="polite"></div>
    <button type="button" class="secondary" id="back">Fertig</button>
  `)
  root.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((r) =>
    r.addEventListener('change', () => setMode(r.value as 'start' | 'random')),
  )
  const clientIdInput = root.querySelector<HTMLInputElement>('#client-id')!
  clientIdInput.addEventListener('input', () => setClientId(clientIdInput.value))
  clientIdInput.addEventListener('change', () => setStatus('Client ID gespeichert.'))
  root.querySelector('#back')!.addEventListener('click', () => (location.hash = '#/'))
}

async function loadRound(token: string): Promise<boolean> {
  try {
    current = await startRound({
      folgen: data.folgen,
      mode: getMode(),
      token,
      getAlbumTracks,
      excludeAlbumIds: lastAlbumId ? [lastAlbumId] : [],
    })
    lastAlbumId = current.folge.albumId
    return true
  } catch (e) {
    setStatus('Konnte Folge nicht laden: ' + (e instanceof Error ? e.message : ''), true)
    return false
  }
}

async function renderQuiz(): Promise<void> {
  const token = getAccessToken()
  if (!token) return void (location.hash = '#/')
  render(root, `
    ${HEADER}
    <div class="player" id="player">
      <div class="hq-hero hq-hero--album" aria-hidden="true">
        <div class="hq-hero__lens"><span class="hq-hero__play"></span></div>
      </div>
      <div class="player__head">
        <p class="player__caseno">Fall #???</p>
        <p class="player__status">Status: Ermittlung läuft</p>
      </div>
      <div class="player__progress" aria-hidden="true">
        <span class="player__bar" id="progress"></span>
      </div>
      <div class="controls">
        <button type="button" id="back10" aria-label="10 Sekunden zurück">${ICON_REWIND('10')}<span>−10s</span></button>
        <button type="button" id="fwd10" aria-label="10 Sekunden vor">${ICON_FORWARD('10')}<span>+10s</span></button>
      </div>
      <button type="button" id="play"><span class="play-tri" aria-hidden="true"></span> Abspielen</button>
      <button type="button" id="skip">Andere Folge</button>
    </div>
    <div class="answer">
      <h1 class="answer__q">Welcher Fall ist das?</h1>
      <div class="field">
        <label for="guess">Folgennummer</label>
        <input type="text" inputmode="numeric" maxlength="3" id="guess" placeholder="Fallnummer eingeben …" autocomplete="off" />
        <span class="field__tag" aria-hidden="true">Nummer</span>
      </div>
      <button type="button" id="check">${ICON_MAGNIFIER} Antwort prüfen</button>
    </div>
    <div id="status" class="status" role="status" aria-live="polite"></div>
  `)
  setStatus('Audio lädt …')
  const ok = await loadRound(token)
  if (!ok) return

  root.querySelector('#play')!.addEventListener('click', () => void playCurrentClip())
  root.querySelector('#back10')!.addEventListener('click', () => void scrubAndPlay(-10000))
  root.querySelector('#fwd10')!.addEventListener('click', () => void scrubAndPlay(10000))
  root.querySelector('#skip')!.addEventListener('click', () => void skipToOtherFolge())
  root.querySelector('#check')!.addEventListener('click', checkAnswer)
  root.querySelector<HTMLInputElement>('#guess')!.addEventListener('input', clearErrorOnInput)
  setStatus('Bereit. Tippe auf Abspielen.')
}

function clearErrorOnInput(): void {
  const raw = root.querySelector<HTMLInputElement>('#guess')!.value
  if (raw === '') {
    setStatus('Bereit. Tippe auf Abspielen.')
    return
  }
  const result = validateGuess(raw)
  if (!result.valid) setStatus(result.error, true)
}

function triggerProgress(): void {
  const player = root.querySelector<HTMLElement>('#player')
  if (!player) return
  // Restart the CSS animation on every play: remove → reflow → re-add.
  // The fill duration is driven by --clip-ms (set from CLIP_MS in ../types),
  // so it always matches the actual clip length regardless of CLIP_MS's value.
  player.style.setProperty('--clip-ms', `${CLIP_MS}ms`)
  player.classList.remove('is-playing')
  void player.offsetWidth
  player.classList.add('is-playing')
}

async function playCurrentClip(): Promise<void> {
  if (!current) return
  const token = getAccessToken()
  if (!token) return
  triggerProgress()
  setStatus('Wiedergabe läuft …')
  try {
    await playClip(token, positionToClip(current.tracks, current.positionMs))
    setStatus('Fertig. Deine Antwort?')
  } catch (e) {
    setStatus(e instanceof NoActiveDeviceError
      ? 'Bitte öffne die Spotify-App auf deinem Handy.'
      : 'Wiedergabe fehlgeschlagen.', true)
  }
}

async function scrubAndPlay(stepMs: number): Promise<void> {
  if (!current) return
  current = { ...current, positionMs: scrub(current.positionMs, stepMs, current.tracks) }
  await playCurrentClip()
}

async function skipToOtherFolge(): Promise<void> {
  await renderQuiz()
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
  const correct = /^Richtig/.test(message)
  const headline = correct ? 'Richtig' : 'Leider nicht'
  const match = message.match(/Folge (\d+) – ([^.\n]+)/)
  const cards = match
    ? `<div class="result-cards" aria-hidden="true">
         <div class="result-card result-card--no">
           <span class="result-card__label">Folge</span>
           <span class="result-card__no">${escapeHtml(match[1])}</span>
         </div>
         <div class="result-card result-card--file">
           <span class="result-card__label">Fall-Datei</span>
           <span class="result-card__file">${escapeHtml(match[2].trim())}</span>
         </div>
       </div>`
    : ''
  render(root, `
    ${HEADER}
    <p class="result-headline">${headline}</p>
    ${cards}
    <div class="result">${escapeHtml(message)}</div>
    <div class="stack">
      <button type="button" id="next">Nächstes Quiz ${ICON_ARROW}</button>
      <button type="button" class="secondary" id="home">Startseite</button>
    </div>
  `)
  root.querySelector('#next')!.addEventListener('click', () => void renderQuiz())
  root.querySelector('#home')!.addEventListener('click', () => (location.hash = '#/'))
}
