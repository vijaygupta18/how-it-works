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
  shortTitle: 'Used in the browser tab',

  // Big parts of the story. They label the progress bar.
  chapters: [{ id: 'dns', title: 'DNS lookup' }],

  // Labelled areas on the stage: [x, y, w, h].
  // wide = 1000 × 572 stage (desktop, landscape), tall = 400 × 420 stage (phones).
  zones: [{ id: 'lan', label: { wide: 'YOUR NETWORK · LAN', tall: 'YOUR NETWORK' },
            at: { wide: [16, 70, 300, 470], tall: [6, 6, 388, 124] } }],

  // Things that talk. Positions are tile centres. Tiles: 56px wide layout, 40px tall layout.
  actors: {
    browser: { label: 'Browser', sub: 'Chrome, Safari', icon: 'browser',
               at: { wide: [106, 190], tall: [70, 52] },
               labelSide: { wide: 'right' },   // optional: label beside the tile
               bubble: { wide: 'left' } }      // optional: where speech bubbles go
  },

  // Roads between actors. Use { a, b, via: { tall: [[x, y], ...] } } to bend one around others.
  links: [['browser', 'router']],

  steps: [{
    chapter: 'dns',
    title: 'Query the recursive resolver',
    proto: 'DNS · UDP :53',                         // optional badge
    text: '<p>Plain explanation, using the real terms.</p>',
    why: '<p>Practical consequence: performance, security, a common bug.</p>',
    tech: '<ul><li>Protocol-level depth (shown under "Under the hood").</li></ul>',
    inspectTitle: 'Query', inspect: `the actual message, indentation is trimmed`,
    try: `dig example.com A`,                       // a command readers can run
    packets: [
      { path: ['os', 'router', 'resolver'], label: 'A? example.com' },
      { path: ['resolver', 'os'], label: 'A 198.51.100.20', reply: true },   // amber
      { path: ['a', 'b'], label: 'encrypted', locked: true, parallel: true }  // padlock, sent together
    ],
    say: { resolver: 'Cache miss. Resolving.' },     // speech bubble, shown when a packet arrives
    work: ['resolver'],                              // "busy" indicator
    pipe: { route: ['browser', 'router', 'cdn'], kind: 'tcp' | 'tls' },  // open connection / encrypted tunnel
    actors: ['db']                                   // extra actors to highlight
  }]
});
```

Actors a step doesn't touch are dimmed. Colours carry meaning everywhere: blue = request, amber = response, green = encrypted.

**Icons:** `browser`, `laptop`, `os`, `router`, `book`, `globe`, `tree`, `server`, `edge`, `db`, `cloud`, `lb`, `user`, `phone`, `lock`, `key`, `queue`, `box`. Add more in `ICONS` at the top of `engine/player.js`.

**Writing steps:** lead with what happens in plain language and the correct terms, keep paragraphs short, put depth in `tech`, the real message in `inspect`, and something runnable in `try`.

## Controls

| Action | Desktop | Phone |
|---|---|---|
| Next / previous step | `→` / `←` | Swipe the diagram or card, or the buttons |
| Auto-play / pause | `Space` | Auto-play button |
| Replay current step | `R` | |
| First / last step | `Home` / `End` | Restart button |
| Jump | Click a chapter name or progress segment | Tap a progress segment |

Every step has its own URL (`#step-7`), so you can link straight to it.

## Deploy

GitHub Pages serves the `main` branch root directly (**Settings → Pages → Deploy from a branch → `main` / `/ (root)`**). Every push to `main` goes live in about a minute. `.nojekyll` makes Pages serve files as-is, including `_template/`.

Live site: https://vijaygupta18.github.io/how-it-works/
