<p align="center">
  <img src="https://img.shields.io/badge/%E2%9D%A4-Just%20Us-8B0000?style=for-the-badge&labelColor=0D0000" alt="Just Us" />
</p>

<h1 align="center" style="color: #FFF0F0;">Just Us</h1>

<p align="center">
  <em style="color: #FF6B8A;">A two-player Valentine's experience you build for the one you love.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-FF2D55?style=flat-square&logo=react&logoColor=FFF0F0&labelColor=0D0000" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-FF2D55?style=flat-square&logo=typescript&logoColor=FFF0F0&labelColor=0D0000" />
  <img src="https://img.shields.io/badge/PartyKit-Realtime-FF6B8A?style=flat-square&logoColor=FFF0F0&labelColor=0D0000" />
  <img src="https://img.shields.io/badge/Three.js-Stars-FF6B8A?style=flat-square&logo=threedotjs&logoColor=FFF0F0&labelColor=0D0000" />
  <img src="https://img.shields.io/github/actions/workflow/status/pradeeppeddineni/justus/ci.yml?style=flat-square&label=CI&color=FF2D55&labelColor=0D0000" />
  <img src="https://img.shields.io/github/license/pradeeppeddineni/justus?style=flat-square&color=8B0000&labelColor=0D0000" />
</p>

---

<br/>

> *Open the same link on two phones. Go through a series of intimate, playful, and deeply personal acts together. No app downloads. No sign-ups. Just a link and two people.*

<br/>

## What is this?

**Just Us** is a browser-based, real-time, synchronized experience for two people. It's fullscreen, immersive, and feels like a native app. Think of it as a cinematic, two-person ritual — not a game, not an app, but something in between.

Two people open the same unique URL on their phones. They're guided through a series of emotionally escalating **"acts"** — from games to art to confessions to physical intimacy prompts.

<br/>

## The Acts

| # | Name | Type | What happens |
|---|------|------|-------------|
| 0 | **The Invitation** | Solo | Cryptic countdown page. Builds anticipation. |
| 1 | **The Lock** | Sync | Both players tap simultaneously to "unlock" the experience. |
| 2 | **How Well Do You Know Me** | Game | Custom questions, simultaneous answers, theatrical reveals. |
| 2.5 | **The Lie Detector** | Game | One tells two versions of a memory. Other detects the lie. |
| 3 | **Through Your Eyes** | Creative | Real-time collaborative drawing across two phones. |
| 3.5 | **Heartbeat** | Sensor | Pulse detection via camera. Both heartbeats visualized together. |
| 4 | **The Unsaid** | Emotional | Type something never said. Particles dissolve and reform on their screen. |
| 4.5 | **Rewrite History** | Reflective | Both reflect on the same memory differently. |
| 5 | **Come Closer** | Physical | Proximity-based prompts. Kiss, embrace, touch. Phone-guided. |
| 5.5 | **Heat** | Intimate | Truth or Strip. Auto-escalating intensity. |
| 5.75 | **Our Moment** | Photo | Each takes a photo. Photos merge into a styled Valentine's card. |
| 6 | **The Promise** | Symbolic | Name a star together in a Three.js star field. One word each. |
| 7 | **The Glitch** | Finale | Fake credits, screen corruption, then a raw pre-recorded video message. |
| — | **The Ghost** | Hidden | Fragments hidden across all acts. When assembled = secret message. |

<br/>

## Design Language

```
MOOD: Intimate darkness with selective warmth.
Think: a candlelit room, not a nightclub.
```

| Token | Color | Usage |
|-------|-------|-------|
| `background` | `#0D0000` | Near-black with warm undertone |
| `primary` | `#8B0000` | Deep blood red |
| `accent` | `#FF2D55` | Hot pink highlights, particles, glows |
| `glow` | `#FF6B8A` | Soft pink halos, bloom effects |
| `text` | `#FFF0F0` | Warm white — never pure `#FFFFFF` |

**Typography:** Playfair Display (display) + Cormorant Garamond (body)

**Animations:** Slow, deliberate (800ms-1200ms). Particles drift, text breathes, nothing bounces.

<br/>

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS (custom tokens only) + CSS Variables |
| Animation | Framer Motion + CSS Keyframes |
| 3D | Three.js (star field in Act 6) |
| Drawing | HTML5 Canvas API |
| Heartbeat | Camera + photoplethysmography |
| Real-time | PartyKit (WebSocket rooms) |
| PWA | vite-plugin-pwa (fullscreen, installable) |
| Hosting | Vercel (frontend) + PartyKit Cloud (sync) |

<br/>

## Quick Start

```bash
# Clone
git clone https://github.com/pradeeppeddineni/justus.git
cd justus

# Install
npm install

# Dev
npm run dev
```

<br/>

## Make It Yours

1. **Fork this repo**
2. **Edit `src/config/config.yaml`** — this is the only file you need to touch
3. **Add your photos** to `src/assets/memories/`
4. **Record your video message** → `src/assets/video/message.mp4`
5. **Deploy:**
   ```bash
   vercel deploy --prod
   npx partykit deploy
   ```
6. **Send the link. Wait.**

<br/>

## Config

All personal content lives in a single YAML file. Zero personal content in code.

```yaml
meta:
  couple_name: "You & Them"
  valentines_date: "2026-02-14T19:00:00"

theme:
  primary: "#8B0000"
  accent: "#FF2D55"
  background: "#0D0000"
  # ... full palette

acts:
  enabled:
    - invitation
    - the_lock
    - know_me
    # ... pick your acts

  know_me:
    questions:
      - question: "Your custom question here"
        category: "deep"
```

See [`src/config/config.yaml`](src/config/config.yaml) for the full schema with every option documented.

<br/>

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (typecheck + vite) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run preview` | Preview production build |

<br/>

## Architecture

```
src/
├── config/          # YAML config, types, device profiles
├── core/            # SyncEngine, StateMachine, Audio, Haptics
├── components/
│   ├── Shell/       # Fullscreen, transitions, ghost fragments
│   ├── shared/      # Particles, glow text, buttons, inputs
│   └── acts/        # One folder per act
├── keepsakes/       # Downloadable card generators
├── hooks/           # useSync, useAct, useShake, useHaptic
├── party/           # PartyKit server (WebSocket room logic)
├── styles/          # Global CSS, typography, animations
└── assets/          # Audio, video, photos, fonts
```

<br/>

## Keepsakes

After the final act, a **"Save Our Night"** screen lets you download themed cards:

- Q&A answer cards
- Combined drawings
- Heartbeat waveform overlay
- "The Unsaid" message cards
- Photo booth card
- Star certificate
- Full session JSON

All cards are `1080x1920` (Instagram story ratio), themed, and bundled as a zip.

<br/>

## Privacy & Security

- **No analytics.** No tracking. No third-party scripts.
- **No server storage.** Session data exists only in PartyKit room memory.
- **No camera frames transmitted.** Only computed BPM values.
- **Room destroyed** after both players disconnect.
- **Max 2 connections** per room. Third connection rejected.
- **HTTPS/WSS only.**

<br/>

## License

[MIT](LICENSE) — make someone's night.

---

<p align="center">
  <sub>Built with obsessive attention to detail, for the only person who matters.</sub>
</p>
