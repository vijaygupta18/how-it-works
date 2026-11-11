# How It Works

Animated, step-by-step explainers of how the internet and software systems work, hosted on GitHub Pages.

Each explainer is a diagram of **actors** (browser, router, DNS server, database…) with **packets** moving between them. The viewer steps through it manually (Next / Prev, arrow keys, swipe) or presses **Auto-play** to watch the whole flow. Works on desktop and phones: the diagram switches to a portrait layout on narrow screens.

**Explainers**

| Explainer | Path |
|---|---|
| What happens when you type a URL and press Enter | `explainers/url-to-page/` |

## Run locally

No build step, no dependencies. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Project layout

```
index.html               home page, lists explainers from explainers/registry.js
assets/                  shared CSS tokens (light/dark) and theme toggle
engine/player.js         the animation player (shared by every explainer)
engine/player.css        player layout + stage styles
explainers/registry.js   list of explainers shown on the home page
explainers/<slug>/       one folder per explainer: index.html + flow.js
explainers/_template/    copy this to start a new one
```

## Add a new explainer

1. Copy `explainers/_template/` to `explainers/<your-slug>/`.
2. Edit `<your-slug>/index.html`: change the `<title>` and description.
3. Write the flow in `<your-slug>/flow.js` (format below).
4. Add an entry to `explainers/registry.js`.
5. Open it locally, check both a wide window and a phone-sized one (DevTools device mode), then push.

## Flow format

```js
HowItWorks.mount({
  title: 'Shown in the header',
  subtitle: 'Optional, shown under the title on wide screens',

  // Phases group steps. They become the colored chips and timeline colors.
  phases: {
    dns: { label: 'DNS', color: '#7c3aed' }
  },

  // Boxes on the stage. Give a position for both layouts:
  //   wide: [x, y] on a 1000 × 560 stage (desktop, landscape)
  //   tall: [x, y] on a 400 × 420 stage (phones in portrait)
  // Box sizes: wide 150 × 60, tall 116 × 44, positions are box centers.
  actors: {
    browser: { label: 'Browser', sub: 'Chrome', icon: 'browser', at: { wide: [110, 190], tall: [70, 40] } }
  },

  // Faint lines always drawn between actors.
  links: [['browser', 'router']],

  steps: [
    {
      phase: 'dns',                       // key from phases
      title: 'Step title',
      proto: 'UDP :53',                   // optional badge
      text: '<p>HTML explanation.</p>',   // <p>, <ul>, <code>, <b>, <p class="aside">
      packets: [                          // animated, in order
        { path: ['os', 'router', 'resolver'], label: 'A? example.com' },
        { path: ['x', 'y'], label: 'starts with previous', parallel: true }
      ],
      work: ['resolver'],                 // spinning "processing" ring
      notes: { resolver: 'cache miss' },  // small tag under (or above) an actor
      actors: ['db'],                     // extra actors to highlight
      inspectTitle: 'DNS query',          // optional collapsible code panel
      inspect: `multi-line text, indentation is trimmed`
    }
  ]
});
```

Actors that a step doesn't touch are dimmed automatically, so each step's focus is clear.

**Icons:** `browser`, `os`, `router`, `globe`, `server`, `db`, `cloud`, `lb`, `user`, `lock`, `phone`, `box`, `key`, `queue`. Add more in the `ICONS` map at the top of `engine/player.js`.

**Optional:** `layouts` overrides the stage sizes, e.g. `layouts: { wide: { w: 1200, h: 600, box: [150, 60], label: 14, sub: 11, icon: 22, packet: 7, pill: 22, pillFont: 12 } }`.

## Controls

| Action | Desktop | Phone |
|---|---|---|
| Next / previous step | `→` / `←` | Swipe the diagram or card, or the buttons |
| Auto-play / pause | `Space` | Auto-play button |
| Replay current step | `R` | |
| First / last step | `Home` / `End` | Restart button |
| Jump | Click a phase chip or timeline segment | Same |

Every step has its own URL (`#step-7`), so you can link straight to it.

## Deploy

`.github/workflows/pages.yml` publishes the repo to GitHub Pages on every push to `main`. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
