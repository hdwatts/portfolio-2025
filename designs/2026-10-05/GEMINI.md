You are redesigning the personal portfolio website of Howard Dean Watts from scratch. This week's design is dated 2026-10-05.

Your working directory is a small, self-contained Vite + React + Tailwind project. Build a complete, polished, distinctive single-page portfolio inside it.

# This week's creative direction

These were picked at random. Commit to them fully; do not water them down into a generic portfolio.

- **Style:** Topographic / cartographic: contour lines, map legends, coordinates as decoration
- **Palette:** Midnight purple with acid green
- **Typography:** Grotesk sans for everything, extreme size contrast
- **Layout:** Magazine spread: multi-column asymmetric pages
- **Motion:** Hover-centric: rich hover and focus states, static otherwise
- **Wildcard constraint:** Use the testimonials as a dominant visual element

Recent designs used these directions, so make sure this one feels clearly different:
- (none yet; this is the first design)

# Hard rules (the build is rejected automatically if any are broken)

1. **You must not write any human-readable text yourself.** Every word, number, or sentence that appears on the page (including `alt`, `aria-label`, `title`, `placeholder`, `<title>`, and CSS `content:`) must come verbatim from `portfolio.json`, imported through `src/data.ts`. That includes headings, button text, navigation, and footers.
   - For section headings, buttons, and similar UI text, use only the strings in `data.labels`. Each label key lists approved alternatives, and you may use any one of them verbatim.
   - You may shorten nothing and paraphrase nothing. You may *select* which data to show, split long strings at sentence boundaries, and change letter case with CSS `text-transform` only.
   - Pure symbols and punctuation (•, /, →, —, #, 01, 02) used as decoration or numbering are allowed. Icons from `lucide-react` are allowed, but give icon-only links an `aria-label` taken from the data.
   - Do not render text into `<canvas>` or bitmap images.
   - The automated checker extracts all text from the built page, compares it against the data, and lists every violation.
2. **Stay inside your working directory.** Do not read, write, or run anything that touches files outside it, except `npm run check`, `npm run snap`, and the read-only media under `/media/` described below. Do not modify `portfolio.json`, `src/portfolio.d.ts`, or `GEMINI.md`; the pipeline overwrites them anyway.
3. **Packages.** The template already includes react, react-dom, motion, lucide-react, tailwindcss, and vite. You may `npm install` other packages if they genuinely improve the design. Doing so is allowed, but it sends this week's design to human review instead of auto-publishing, so only install packages when they are worth it. Never run `npm install` with `--force`, global flags, or git URLs. Web fonts may be loaded from Google Fonts via `<link>` in `index.html` without installing anything.
4. **Media.** Images and videos live at absolute URLs under `/media/` (paths are listed in the data, e.g. `data.person.headshot.src`). Reference them by those exact absolute paths. Do not copy them into the project.
5. **Required elements.** Include the person's name, a visible link to every entry in `data.person.links`, every project with its links and store badges, and a link to `/history` labelled with one of `data.labels["nav.history"]`. Every link's `href` must come from the data, except `/history` and in-page `#anchors`.
6. **Security.** Pages are served with a strict Content Security Policy. Scripts may only come from your bundled files, so there are no inline `<script>` tags, CDNs, or `eval`. The only network access allowed is Google Fonts (CSS from fonts.googleapis.com, files from fonts.gstatic.com). No other external images, APIs, iframes, analytics, redirects, `<base>`, or meta refresh. The checker blocks and reports any of these.
7. **Quality bar.** The page must be responsive from 360px to 2560px wide, keyboard accessible, and meet WCAG AA color contrast. It must respect `prefers-reduced-motion`, show no console errors, and avoid horizontal scrolling on mobile. Phone videos should be `muted autoplay loop playsinline` with their poster.

# Workflow

1. Read `portfolio.json` and `src/portfolio.d.ts` to understand all available content.
2. Plan the design briefly, then implement it in `src/` (you may restructure `src/` freely, add components and CSS, and edit `index.html` and `vite.config.ts`).
3. Run `npm run build` to make sure it compiles.
4. Run `npm run check`. It builds the page, then runs the text-provenance check and accessibility checks and prints every problem. Fix them all and repeat until it passes.
5. Run `npm run snap` to capture `.snap/desktop.jpg` and `.snap/mobile.jpg`, then read those images to review your work visually. Iterate on anything that looks unpolished, broken, or generic. One or two review rounds is plenty.
6. When `npm run check` passes and you are happy with the screenshots, stop and reply with a one-paragraph summary of the design. That summary is for logs only and is never shown on the site.

You have a hard spending budget. Work efficiently: avoid re-reading large files unnecessarily and keep iterations purposeful.

