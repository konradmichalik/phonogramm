# Design: „??? Hörspiel-Quiz" — Webanwendung

**Datum:** 2026-07-01
**Status:** Genehmigt

## Ziel

Mobil optimiertes Quiz für Smartphones: Der Nutzer hört einen 5 Sekunden langen
Ausschnitt einer „Die drei ???"-Hörspielfolge (Wiedergabe über Spotify) und errät
die Folgennummer. Hosting als statische Seite über GitHub Pages.

## Zentrale technische Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Playback | Spotify **Connect / Web-API** mit **Premium** | Einziger Weg für echte 5-Sek-Ausschnitte mit Seek (nach Intro / zufällige Mitte) + Auto-Stop auf dem Handy. Web Playback SDK läuft nicht in mobilen Browsern; Free kann per API nicht seeken. |
| Auth | OAuth **Authorization Code + PKCE** | Kein Client-Secret nötig → kompatibel mit statischem Hosting (kein Backend). |
| Hosting | GitHub Pages (statisch) | Anforderung. Kein Server. |
| Folgen-Daten | Statische `data/folgen.json` im Repo | Versioniert, kein Backend, einfach zu pflegen. |
| Intro-Offset (Modus 1) | Pauschaler Default + optionale Überschreibung pro Folge | Pragmatisch, nachbesserbar, wenig Handarbeit. |
| Tech-Stack | **Vite + TypeScript (Vanilla)** | Leichtgewichtig, getypt, testbar; kein Framework-Overhead für ~4 Screens. |

### Bewusst NICHT enthalten (YAGNI)

Keine Score-Historie, keine Bestenliste, kein Multiplayer, kein serverseitiger
Token-Refresh (kurze Sessions, Re-Login bei Token-Ablauf).

### Voraussetzungen beim Nutzer

Spotify **Premium**; Spotify-App **installiert und geöffnet** (wird als aktives
Connect-Gerät angesteuert). Fehlt ein aktives Gerät → klare Fehlermeldung.

## Architektur

Statische SPA, gebaut mit Vite + TypeScript (Vanilla), deployed auf GitHub Pages.
Kein Backend. Hash-basiertes Routing.

```
src/
  main.ts              # Entry, Router (#/ #/quiz #/settings)
  auth/                # PKCE-Flow, Token-Storage (sessionStorage), Ablauf-Handling
  spotify/             # API-Client (play, pause, getAlbumTracks, getDevices)
  quiz/                # Quiz-Logik: Folgenauswahl, Clip-Berechnung, Auswertung (netzwerkfrei)
  ui/                  # Screens: Start, Quiz, Result, Settings + Feedback/Toasts
  data/folgen.json     # Kuratierte Folgenliste
  state/               # Settings (localStorage), aktueller Quiz-Zustand
```

**Modulgrenzen:**

- `spotify/` — kennt nur Spotify, kein Quiz-Wissen.
- `quiz/` — reine Logik (Folge wählen, Clip-Position berechnen, Antwort prüfen),
  **komplett ohne Netzwerk** → vollständig unit-testbar.
- `ui/` — orchestriert Screens und Feedback.
- `auth/` — isoliert den OAuth-Flow.

## Datenmodell (`data/folgen.json`)

```jsonc
{
  "defaultIntroEndMs": 35000,
  "folgen": [
    {
      "nummer": 125,
      "titel": "Feuermond",
      "albumId": "SPOTIFY_ALBUM_ID",
      "introEndMs": 42000   // optional, überschreibt defaultIntroEndMs
    }
  ]
}
```

Track-Längen werden zur Laufzeit per `GET /albums/{id}/tracks` geholt und pro
Session gecacht (nicht in der JSON gepflegt). Beim Laden wird die JSON-Struktur
per **Zod** validiert.

## Playback-Logik

Eine Folge auf Spotify = Album mit vielen kurzen Tracks (Kapiteln).

**Modus 1 – Folgenbeginn:** Track 1 des Albums, Start bei `introEndMs` (oder
`defaultIntroEndMs`), 5 Sek abspielen, dann pausieren.

**Modus 2 – Zufällige Mitte:** Zufälligen Track aus dem mittleren Bereich wählen
(nicht erster/letzter Track → schließt Intro/Abspann aus), darin zufällige Position
mit Sicherheitsabstand (Position + 5000 ms muss in den Track passen), 5 Sek
abspielen, dann pausieren.

**Technischer Ablauf:** `PUT /me/player/play` mit `{ uris:[trackUri], position_ms }`
→ nach 5000 ms clientseitiger Timer → `PUT /me/player/pause`. Kein aktives Gerät →
Fehlermeldung „Bitte öffne die Spotify-App auf deinem Handy".

## UI-Flow & Screens

Vier Screens, Touch-optimiert, große Buttons, dunkles Design.

- **Start:** „Neues Quiz" (falls nicht eingeloggt → Spotify-Login); Zahnrad → Einstellungen.
- **Quiz:** großer Play-Button (5-Sek-Clip, wiederholbar); numerisches Eingabefeld
  (`inputmode="numeric"`, max 3 Ziffern, Live-Validierung); „Antwort prüfen".
- **Result:** Richtig/Falsch-Feedback mit Folgennummer + Titel; „Nächstes Quiz".
- **Settings:** Umschalter Modus 1 / Modus 2, persistiert in `localStorage`, bleibt erhalten.

**Feedback-Zustände** (Toast/Statuszeile): Audio lädt · Wiedergabe läuft · Richtig ·
Falsch · Ungültige Eingabe · Kein Spotify-Gerät. Dezente Übergangsanimationen,
respektiert `prefers-reduced-motion`.

**Rückmeldungstexte (Beispiele):**

- Richtig: „Richtig! \n Folge 125 – Feuermond"
- Falsch: „Leider nicht richtig. Versuch es beim nächsten Mal! \n Gesucht war Folge 125 – Feuermond."

**Look & Feel:** Dunkler Hintergrund, Akzente Rot/Weiß, hoher Kontrast, klare
Typografie, geheimnisvolle/spannende Stimmung — **ohne** geschützte Originalgrafiken
(eigene Gestaltung, nur atmosphärisch angelehnt).

## Eingabe-Validierung (Zod)

Regel: `^[1-9][0-9]{0,2}$` → ganze Zahl, 1–3 Ziffern, ≥ 1, keine führende Null,
keine Dezimalzahl, keine negative Zahl, keine Buchstaben/Sonderzeichen. Ungültige
Eingabe wird sofort mit verständlicher Fehlermeldung erklärt.

## Nichtfunktionale Anforderungen

- **Performance:** Reaktion < 2 Sek; Clip-Start ohne wahrnehmbare Verzögerung.
- **Verfügbarkeit:** Aktuelle Smartphone-Browser (Android + iOS).
- **Sicherheit/Datenschutz:** OAuth PKCE; keine Spotify-Zugangsdaten gespeichert;
  keine unnötigen personenbezogenen Daten, kein Tracking/Analytics.

## Testing

- **Unit (Vitest):** `quiz/`-Logik (Folgenauswahl, Clip-Positionsberechnung inkl.
  Randfälle, Antwortvergleich), Eingabe-Validierung, JSON-Zod-Schema; Spotify-Client gemockt.
- **E2E (Playwright):** kritischer Flow mit gemocktem Spotify-API (Quiz starten →
  Eingabe → Auswertung → nächstes Quiz). Echtes Spotify-Playback = manueller Smoke-Test.
- **Ziel:** 80 %+ Coverage auf der Logik.

## Akzeptanzkriterien

- 5-Sek-Audioausschnitt wird abgespielt.
- Nur gültige Folgennummern eingebbar (Validierung greift).
- Richtige/falsche Antworten korrekt erkannt.
- Vollständige Folgennummer + Titel werden angezeigt.
- Umschaltung zwischen Modus 1 und Modus 2 möglich und persistent.
- Auf Smartphones intuitiv bedienbar.
- Spotify-Anbindung funktioniert zuverlässig (Premium + aktives Gerät vorausgesetzt).
- UI vermittelt eine spannende, an die Hörspielreihe angelehnte Atmosphäre.
