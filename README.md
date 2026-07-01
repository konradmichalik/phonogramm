# 🎧 Hörspiel-Quiz

Ein browserbasiertes Quiz für Hörspielfans: Es spielt einen exakten 5-Sekunden-Ausschnitt
aus einer Folge und du musst erraten, um welche Folge es sich handelt.

Die Wiedergabe läuft über **Spotify Connect** — die Web-App selbst spielt keinen Ton,
sondern steuert deine bereits geöffnete Spotify-App fern (als aktives Connect-Gerät),
spielt den Ausschnitt exakt 5 Sekunden lang ab und pausiert danach automatisch wieder.

## Voraussetzungen

- **Spotify Premium** (Voraussetzung der Spotify-Playback-API für Fernsteuerung)
- Die **Spotify-App muss auf einem Gerät geöffnet und aktiv sein** (Desktop, Mobile oder
  Web-Player) — dieses Gerät wird als Connect-Ziel ferngesteuert. Ohne aktives Gerät kann
  kein Clip abgespielt werden.
- Ein moderner Browser (die Web-App selbst läuft rein clientseitig, kein eigener Player)

## Spielmodi

- **Modus 1 – Folgenbeginn**: Der Ausschnitt startet kurz nach dem Intro der Folge.
- **Modus 2 – Zufälliger Ausschnitt**: Der Ausschnitt startet an einer zufälligen Stelle
  aus der Mitte der Folge.

Der gewählte Modus wird im `localStorage` gemerkt und bleibt zwischen Sitzungen erhalten.

## Setup

```bash
npm install
```

Anschließend eine `.env`-Datei im Projektroot anlegen (siehe `.env.example`):

```bash
VITE_SPOTIFY_CLIENT_ID=deine_spotify_client_id
```

### Spotify Developer Dashboard

1. Im [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) eine neue App
   anlegen.
2. Die **Client ID** aus den App-Einstellungen kopieren und in `.env` als
   `VITE_SPOTIFY_CLIENT_ID` eintragen. Ein Client Secret wird **nicht** benötigt — die App
   nutzt OAuth Authorization Code Flow mit PKCE.
3. Unter „Redirect URIs" folgende URIs registrieren:
   - **Lokal:** `http://127.0.0.1:5173/hoerspiel-quiz/`
     Spotify erlaubt seit einiger Zeit kein `http://localhost` mehr als Redirect-URI,
     sondern nur noch die Loopback-IP `127.0.0.1`. Den Dev-Server deshalb explizit über
     `http://127.0.0.1:5173/hoerspiel-quiz/` öffnen, nicht über `localhost`.
   - **Produktion:** `https://<dein-github-user>.github.io/hoerspiel-quiz/`

## Befehle

```bash
npm run dev      # Dev-Server starten (siehe Hinweis zu 127.0.0.1 oben)
npm run build    # Typecheck + Produktionsbuild nach dist/
npm test         # Unit-/Integrationstests (Vitest)
npm run e2e      # End-to-End-Tests (Playwright)
```

## Folgen-Daten pflegen

Die Liste der spielbaren Folgen liegt in `src/data/folgen.json`. Aktuell enthält sie
Platzhalter-Werte (`"albumId": "PLATZHALTER_ALBUM_ID"`), die vor dem produktiven Einsatz
durch echte Spotify-Album-IDs ersetzt werden müssen:

```json
{
  "defaultIntroEndMs": 35000,
  "folgen": [
    { "nummer": 125, "titel": "Feuermond", "albumId": "<echte Spotify-Album-ID>" }
  ]
}
```

- `albumId`: Spotify-Album-ID der jeweiligen Hörspielfolge (zu finden über „Link teilen" →
  „Album-Link kopieren" in Spotify).
- `titel` / `nummer`: Anzeigename und Folgennummer für die Auflösung im Quiz.
- `introEndMs` (optional, pro Folge): Millisekunden-Zeitpunkt, an dem das Intro endet.
  Überschreibt den globalen `defaultIntroEndMs`-Wert für Modus 1 und kann bei Bedarf pro
  Folge feinjustiert werden, falls das Intro kürzer oder länger als üblich ist.
- `skipLeadingTracks` (optional, Standard `0`): Entfernt die ersten N Tracks aus dem
  spielbaren Zeitstrahl (betrifft beide Modi) — etwa eine „Inhaltsangabe"-Spur, die Folgennummer
  und Titel bereits verrät. Den passenden Wert per Blick in die Tracklist des Albums bei
  Spotify ermitteln.

## Deployment (GitHub Pages)

Das Projekt wird über `.github/workflows/deploy.yml` automatisch bei jedem Push auf `main`
gebaut und auf GitHub Pages veröffentlicht. Einmalig einzurichten:

1. GitHub-Repository unter dem Namen **`hoerspiel-quiz`** anlegen (der Vite-`base`-Pfad
   `/hoerspiel-quiz/` in `vite.config.ts` geht von diesem Namen aus). Heißt das Repo anders,
   muss `base` entsprechend angepasst werden.
2. Unter **Settings → Secrets and variables → Actions → Variables** eine Repository-Variable
   `SPOTIFY_CLIENT_ID` mit der eigenen Spotify-Client-ID anlegen. Der Workflow reicht sie
   beim Build als `VITE_SPOTIFY_CLIENT_ID` durch — sie wird nie im Repository gespeichert.
3. Unter **Settings → Pages** als Quelle **„GitHub Actions"** auswählen.
4. Nach dem ersten erfolgreichen Deploy ist die App unter
   `https://<dein-github-user>.github.io/hoerspiel-quiz/` erreichbar. Diese URL muss wie
   oben beschrieben auch als Redirect-URI im Spotify Dashboard hinterlegt sein.
