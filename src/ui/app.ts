import folgenJson from '../data/folgen.json'
import { parseFolgenData } from '../data/folgenSchema'
import { beginLogin, exchangeCodeForToken, getAccessToken, SPOTIFY_CONFIG } from '../auth/spotifyAuth'
import { getAlbumTracks, NoActiveDeviceError } from '../spotify/client'
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
    <button type="button" id="start">Neues Quiz</button>
    <button type="button" class="secondary" id="settings">Einstellungen</button>
    <div id="status" class="status" role="status" aria-live="polite"></div>
  `)
  root.querySelector('#settings')!.addEventListener('click', () => (location.hash = '#/settings'))
  root.querySelector('#start')!.addEventListener('click', () => {
    if (!getAccessToken()) return void startLogin()
    location.hash = '#/quiz'
  })
}

async function startLogin(): Promise<void> {
  try {
    await beginLogin(SPOTIFY_CONFIG)
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
    <button type="button" class="secondary" id="back">Zurück</button>
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
    <button type="button" id="play">▶ Ausschnitt abspielen</button>
    <label for="guess">Folgennummer</label>
    <input type="text" inputmode="numeric" maxlength="3" id="guess" placeholder="z. B. 42" autocomplete="off" />
    <button type="button" id="check">Antwort prüfen</button>
    <div id="status" class="status" role="status" aria-live="polite"></div>
  `)
  setStatus('Audio lädt …')
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
  root.querySelector<HTMLInputElement>('#guess')!.addEventListener('input', clearErrorOnInput)
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
    <button type="button" id="next">Nächstes Quiz</button>
    <button type="button" class="secondary" id="home">Startseite</button>
  `)
  root.querySelector('#next')!.addEventListener('click', () => renderQuiz())
  root.querySelector('#home')!.addEventListener('click', () => (location.hash = '#/'))
}
