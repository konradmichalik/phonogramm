# 🎧 Phonogramm

> A browser-based quiz for audio-drama fans: it plays an exact 10-second snippet from an
> episode and you have to guess which episode it is.

Playback runs via **Spotify Connect** — the web app itself plays no audio; instead it
remotely controls your already-open Spotify app (as the active Connect device), plays the
snippet for exactly 10 seconds, then pauses again automatically.

> [!NOTE]
> This is a private fun project.

## ⚙️ Requirements

> [!IMPORTANT]
> Requires **Spotify Premium** and an already **open, active Spotify device** (desktop,
> mobile, or web player) — the app remote-controls it as the Connect target. Without an
> active device, no clip can be played.

- A modern browser (the app runs entirely client-side, with no built-in player)

## ✨ Game modes

- **Mode 1 – Episode start**: The snippet starts shortly after the episode's intro. The exact
  start time can be configured per episode via `startSeconds` in `src/data/folgen.json`.
- **Mode 2 – Random snippet**: The snippet starts at a random point in the middle of the
  episode.

The selected mode is stored in `localStorage` and persists between sessions.
