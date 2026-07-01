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

function renderStart(): void {
  render(root, `
    <h1>??? Hörspiel-Quiz</h1>
    <p>Errate die Folge am 5-Sekunden-Ausschnitt.</p>
    <button type="button" id="start">Neues Quiz</button>
    <button type="button" class="secondary" id="settings">Einstellungen</button>
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
    <h1>Einstellungen</h1>
    <fieldset>
      <legend>Ausschnitt-Modus</legend>
      <label for="mode-start">
        <input type="radio" id="mode-start" name="mode" value="start" ${mode === 'start' ? 'checked' : ''}/> Folgenbeginn (nach Intro)
      </label>
      <label for="mode-random">
        <input type="radio" id="mode-random" name="mode" value="random" ${mode === 'random' ? 'checked' : ''}/> Zufälliger Ausschnitt
      </label>
    </fieldset>
    <fieldset>
      <legend>Spotify-Verbindung</legend>
      <label for="client-id">Spotify Client ID</label>
      <input type="text" id="client-id" autocomplete="off" spellcheck="false" value="${escapeAttr(getClientId())}" />
      <p class="hint">Die Client ID erhältst du im <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer noopener">Spotify Developer Dashboard</a>. Trage dort als Redirect-URI <code>${location.origin}${import.meta.env.BASE_URL}</code> ein.</p>
    </fieldset>
    <div id="status" class="status" role="status" aria-live="polite"></div>
    <button type="button" class="secondary" id="back">Zurück</button>
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
    <h1>Welche Folge?</h1>
    <div class="controls">
      <button type="button" id="back10">−10 Sek</button>
      <button type="button" id="back5">−5 Sek</button>
      <button type="button" id="play">▶ Abspielen</button>
      <button type="button" id="fwd5">+5 Sek</button>
      <button type="button" id="fwd10">+10 Sek</button>
    </div>
    <button type="button" class="secondary" id="skip">⏭ Andere Folge</button>
    <label for="guess">Folgennummer</label>
    <input type="text" inputmode="numeric" maxlength="3" id="guess" placeholder="z. B. 42" autocomplete="off" />
    <button type="button" id="check">Antwort prüfen</button>
    <div id="status" class="status" role="status" aria-live="polite"></div>
  `)
  setStatus('Audio lädt …')
  const ok = await loadRound(token)
  if (!ok) return

  root.querySelector('#play')!.addEventListener('click', () => void playCurrentClip())
  root.querySelector('#back10')!.addEventListener('click', () => void scrubAndPlay(-10000))
  root.querySelector('#back5')!.addEventListener('click', () => void scrubAndPlay(-5000))
  root.querySelector('#fwd5')!.addEventListener('click', () => void scrubAndPlay(5000))
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

async function playCurrentClip(): Promise<void> {
  if (!current) return
  const token = getAccessToken()
  if (!token) return
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
  render(root, `
    <h1>Ergebnis</h1>
    <div class="result">${escapeHtml(message)}</div>
    <button type="button" id="next">Nächstes Quiz</button>
    <button type="button" class="secondary" id="home">Startseite</button>
  `)
  root.querySelector('#next')!.addEventListener('click', () => void renderQuiz())
  root.querySelector('#home')!.addEventListener('click', () => (location.hash = '#/'))
}
