# Feral Pictures

A one-page website for **Feral Pictures**, a fictional director-led production company in Los Angeles. The look is built from one idea: **words on white slabs seen in perspective** (in the spirit of Uniforma's *You Did This* festival identity), set in black and white, with colour coming only from the footage.

## Files

```
feral/
├── index.html            all markup and copy
├── style.css             all styling: tokens first, then one block per section in page order
├── script.js             all behaviour
├── README.md
└── assets/
    ├── favicon.svg
    ├── audio/            feral-theme.m4a, the reel's music on its own (played under every other film in the popup)
    ├── fonts/            Anton, Inter Tight (variable 400–900), Instrument Serif italic (woff2, latin)
    ├── js/               gsap 3.12.5, ScrollTrigger 3.12.5, lenis 1.1.13
    ├── img/              a WebP poster for every clip (shown until the clip is hovered)
    └── video/            20 graded loops (1600×900, H.264, no audio) + reel.mp4 (1920×1080, 22 s, with music)
```

There's no build step and no network dependency. Fonts and libraries are local, so **double-clicking `index.html` works offline** (file://) and looks the same as when it's served. To serve it:

```bash
npx http-server feral -p 5197 -c-1
```

It is also registered in `.claude/launch.json` as **feral**.

---

## 1. Design system

| | |
|---|---|
| Ground | `#000` everywhere |
| Ink | `#fff` text, white slabs, the white info side of a film card |
| Grey | `rgba(255,255,255,.58)` secondary text; `.28` for hairlines |
| Colour | only in the footage (natural, bright, clean grade) |
| Slab type | **Anton**, uppercase, squeezed to 30% width (`scaleX(.3)`) |
| Display type | **Inter Tight 900** caps (`.g`) mixed with **Instrument Serif italic** lowercase (`.s`) |
| Labels | Inter Tight 500, 11.5px, uppercase, +0.02em (`.lbl`) |
| Ease | one curve, `cubic-bezier(.16, 1, .3, 1)` (`expo.out` in GSAP) |
| Corners | square |

### The slab (`.plates`)
The building block of the site: the loader, nav logo, Menu/Close button, menu links, hero wordmark, cursor, director tags, contact line and footer are all slabs.

- Markup: `data-plates="We|Are|Feral"` makes one slab per word; `data-words="Sports|Commercial"` makes one slab that rolls through words; `data-tag="Big|small|small"` adds the vertical label to the first slab (big line reads down from the top, two small lines sit at the bottom).
- Size: set `--pf` on the container. A slab is `2.2 × --pf` tall.
- **Letter box**, measured on the reference: the capitals fill 84% of the slab height, with **9% air above and 7% below** (Anton's cap height is 0.86em, so the word is set at `2.149em` with a `.058em` top inset). Side padding `.13em` / `.12em`.
- **Perspective**: every slab is turned 35° with a lens of 1.8× its own width, so short and long words taper the same way (tall left edge, about 70% at the right).
- **Touching, no seams**: `fitPlate()` measures each tilted slab, shifts it so its tall edge sits on its layout edge, and gives it a negative right margin so the next slab overlaps it by 1px. The tall left edge of each slab stands against the short right edge of the one before, which makes the stepped skyline of the reference.
- **Roll**: `roll()` swaps a slab's word. The old word leaves upwards, the new one rises, the slab resizes to fit, and its neighbours re-fit (VOTE → NOW on the reference).

### Blinds (`.slats`)
A row of full-height black strips that fold edge-on in perspective, one after another. The loader opens with them and the menu closes with them.

---

## 2. Page, top to bottom

### Loader
Black screen. One slab turns in from edge-on, tagged *Feral Pictures / loading / the reel*, and rolls its number **000 → 024 → 047 → 073 → 100**. The last roll waits until the fonts and the hero posters are ready (with a 1.9 s minimum). Then the slab turns edge-on and away, and the twelve blinds fold open left to right onto the hero. The wordmark slabs turn in as the blinds pass and the film cards slide in from the right.

### Hero: the projector
- Top: a countdown to the next shoot in condensed numerals, with superscript labels. It rolls forward a week once the date passes. Note on the right.
- Left: **WE | ARE | FERAL** slabs with the vertical tag. They stay put.
- Right: a line of film cards, tilted like the slabs (and as tall as the slabs' tall edge), so they read as more slabs made of footage. The line doesn't crawl. Like film through a projector, it **holds a frame for 2.6 s, then pulls down exactly one card** in 1.35 s (`expo.inOut`). During each pull:
  - The card in **the gate** (third slot, second on phones) turns back from its white info side while the next card **turns open** into the same spot. The info side shows title, client, year, format and director.
  - The card next to the wordmark **folds edge-on into it**, hinged on its left edge, and its caption narrows with it. The wordmark **recoils** a few pixels as it lands, and the card rejoins the end of the line.
  - The gaps **stretch like an accordion** and the tilted cards lean a few degrees further, then everything settles back into place.
  - After every fourth pull (one full lap of the films), the three wordmark slabs turn a full circle in a wave.
- Progress, centred in the footer row: the gate card's number (**01 / 04**) rolls up after each pull, and a hairline between the numbers fills while the frame holds and wipes out as the next pull starts.
- The speed is constant. Hovering doesn't slow it, and scrolling doesn't push it. Hovering a card plays its clip, and clicking opens the player. The projector pauses where it is when the hero is off screen, the tab is hidden, or the menu or player is open.
- How it works: the whole pull is one eased number, `u` from 0 to 1 (`bp.u`). Each card's angle, width and openness is a pure function of its slot and `u`, so nothing drifts and no two tweens touch the same card. At `u = 1` the picture is identical to the next pull's `u = 0`, so the loop is seamless. The script projects each card's edges with perspective maths: a card of width `w`, turned `θ`, under perspective `P` has its edges at `-h·cosθ·P/(P − h·sinθ)` and `h·cosθ·P/(P + h·sinθ)` (`h = w/2`). That gives each card's visible width without reading the DOM, so it places the cards edge to edge and only writes `transform`s, with no layout work per frame.
- Footer row: copyright, **Play the reel, sound on**, progress, footage credit.
- The nav stays hidden over the hero and fades in once you scroll past it.

### Nav
- Left: the logo as two small slabs, **FERAL | PICTURES**. They spin on hover.
- Right: *Contact* (letters roll on hover) and a **MENU** slab that rolls to **CLOSE** when the menu is open.

### Menu
The blinds fold shut from the right into a black sheet. The five links then turn in as **one connected row of slabs**, sized by script to span the screen: **WORK | STUDIO | INDEX | DIRECTORS | CONTACT**. Each slab carries a tag (number, then a two-word description). Hovering a slab **turns it flat to face you** and scales it up slightly, while the others step back to 40%. Above the row is *(Menu) / Five ways in*, and below it a ruled footer with email, city and Instagram. Closing reverses the idea rather than the timeline: the slabs turn back to edge-on, then the blinds fold open from the right. Open and close are two separate timelines, and hover tweens are ignored while either one runs, so rapid clicks never leave a slab half-turned. Esc closes the menu. On phones the row stacks vertically.

### Cursor
A soft grey dot. Over any film it becomes a **small white slab** reading **WATCH** (or **REEL** on directors, **PLAY** on the studio reel) that leans into the mouse's horizontal movement and settles back to the slab angle when the mouse stops. It's hidden on touch devices.

### (01) Studio
Section head: *(01) Studio | Wild ideas. Real **pictures.** | Est. 2014*. The showreel tile sits on the left. On the right is a statement whose words light up as you scroll, with italic serif phrases, and below it a ruled list of disciplines that wipes in.

### Manifesto
*Nobody puts us in a box. We shoot what bites back.* Six lines, each fitted to the full width (Inter Tight 900 caps mixed with Instrument Serif italic). Small clips are cut into the gaps, and these clips play whenever they're on screen. Alternate lines drift in opposite directions as you scroll.

### (02) Index
Six films in a staggered 12-column mosaic of mixed aspect ratios, captioned with the client in grey italic over the title in bold. Each frame unveils from the bottom while its poster settles from a zoom, and hovering plays the clip. One tile in three moves at a slightly different scroll speed.

### (03) Directors
Six portrait clips, with even ones dropped lower. Each has a small slab that rolls through that director's disciplines, out of step with its neighbours, and only while it's on screen. Hovering plays the reel; clicking opens it.

### (04) Contact
*GOT A | STORY?* slabs whose last word rolls through Story? / Script? / Idea? / Brand?, then a big email link with an arrow and the new-business contact.

### Footer
Four columns (line, site links, social, address) above a full-width **WE | ARE | FERAL** slab mark that turns in, then a base row: copyright, credits, back to top.

### Player
A full-screen black dialog that wipes down. The video is shown whole (`contain`) with the title in Anton, the client in italic serif, a **Sound on/off** toggle, and a ring that fills with progress next to the timecode. Clicking the video or the ring pauses it, and Esc or Close shuts it. **Every film opens with sound**: the showreel plays its own soundtrack, and every other clip (they have no audio track) plays muted with `feral-theme.m4a`, the same music, looping underneath from the start. Pause, play and the sound toggle drive both together. If the browser blocks sound, the film plays muted and the toggle offers *Sound on*.

---

## 3. Showreel audio

`reel.mp4` carries a 22-second cut of **"Cat Walk"** from Mixkit (free licence, no attribution required; credited in the footer anyway). The cut starts at 0:39.7 of the track, fades in over 0.25 s and out over the last 1.8 s, and is loudness-normalised to −15 LUFS (AAC 160 kbps). The picture is the 10-shot montage (2.2 s per shot) re-encoded at CRF 22 with a 4 Mbps cap and `+faststart`.

To swap the track:

```bash
ffmpeg -i reel-silent.mp4 -ss <start> -t 22 -i track.mp3 -map 0:v -map 1:a -c:v copy \
  -af "afade=t=in:d=0.25,afade=t=out:st=20.2:d=1.8,loudnorm=I=-15:TP=-1.5" -c:a aac -b:a 160k -shortest -movflags +faststart reel.mp4
```

The same cut is also saved as `assets/audio/feral-theme.m4a` (audio only, about 480 KB) for the popup to play under the other 20 clips, which have no audio track. If you swap the reel's music, regenerate it:

```bash
ffmpeg -i assets/video/reel.mp4 -vn -c:a copy -movflags +faststart assets/audio/feral-theme.m4a
```

---

## 4. Performance

- **Posters first**: every film tile and hero card shows a ~30–120 KB WebP poster. Its video (`preload="none"`) is only fetched and played on mouse hover, and paused on leave. Only the four small manifesto clips autoplay, and only while on screen.
- **Hero belt**: pure arithmetic, transform-only writes, no `getBoundingClientRect` per frame. It stops ticking when the hero is off screen or the tab is hidden.
- **Slab rolls** (directors, contact) are gated by an IntersectionObserver, so they only run while visible.
- **Cursor**: no `backdrop-filter`. Hit-testing runs on pointer move and is throttled to every 120 ms while scrolling.
- **Smooth scroll**: Lenis drives ScrollTrigger from the GSAP ticker. Scrubbed tweens use transform and opacity only.
- **Fonts**: three local woff2 files (about 86 KB in total). Anton uses `font-display: block` because slabs are measured from it, and the script waits for `document.fonts.load` before measuring.
- **Video files**: H.264 with `+faststart` (the index sits at the start), so a hovered clip starts after its first few hundred KB.
- **No animation fights**: an intro tween and a scroll tween never animate the same property of the same element (for example, the intro turns each `.plate`, while the scroll parallax moves `.hero__stage`).

---

## 5. Responsive

Under 760px:
- The hero stacks the wordmark above the belt, and cards fold at the left screen edge.
- Section heads stack, and the mosaic becomes two columns with full-width hero tiles.
- Directors go to two columns.
- The menu becomes a vertical stack of slabs.
- The nav drops the *Contact* link.
- The custom cursor is off on touch devices.

---

## 6. Credits

- Footage: Pexels contributors (free licence), graded and re-encoded.
- Music: "Cat Walk", Mixkit (free licence).
- Type: Anton (Vernon Adams), Inter Tight (Rasmus Andersson), Instrument Serif (Instrument), all SIL Open Font License.
- Libraries: GSAP + ScrollTrigger (GreenSock standard licence), Lenis (MIT).
- Identity reference: *You Did This* by Uniforma; content structure after Naked City and Il Capo.
