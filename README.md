# hdwatts.com

A data-driven portfolio that **redesigns itself every week**. A GitHub Action has
Gemini build a brand-new design from scratch, using only the content in
`data/portfolio.json`. The home page opens with a timeline that flashes through
every past design before settling on the current one.

## Layout

| Path | What it is |
| --- | --- |
| `data/portfolio.json` | **All content.** Designs may render nothing else. `labels` holds the approved UI text (section titles, buttons). |
| `data/portfolio.d.ts` | Types for the data. Copied into every design. |
| `data/resume.json` | Resume-only fields (email, phone). Never shown to the design agent. |
| `designs/<date>/` | One frozen design per week: a self-contained Vite app + `design.json` (variants, cost, screenshots). |
| `public/v/<date>/` | Its published build, served at `/v/<date>/`, plus screenshots. |
| `public/media/` | Shared images/videos referenced by absolute `/media/...` URLs. |
| `redesign/` | The pipeline: `config.json`, `variants.json`, `prompt.md`, `template/`, `hooks/`, `lib/`. |
| `src/pages/` | Astro pages: `/history`, the resume source, and a fallback home page. |

## How a weekly run works (`.github/workflows/redesign.yml`)

1. One option is picked at random per category in `redesign/variants.json`, avoiding recent repeats, and injected into `redesign/prompt.md`.
2. `redesign/template/` is copied to `designs/<date>/`, and Gemini CLI runs **inside that folder only**:
   - The `BeforeTool` hook denies file access and shell commands that leave the folder.
   - The `BeforeModel` hook refuses any call that could push spend past **$10**. An outer watchdog reads telemetry and kills the CLI as a backstop.
   - The settings live outside the sandbox at system precedence, so the agent can't edit away its own guardrails.
3. The pipeline checks the git diff (nothing outside the folder may change), scans for symlinks and leaked secrets, then builds and runs **publishing checks**:
   - every visible string, `alt`/`aria-label`/`title` and CSS `content:` must appear verbatim in the data
   - links must come from the data
   - every project, store link and profile link must appear
   - axe accessibility, no console errors, no horizontal scroll on mobile
4. If the checks fail, the agent gets the report and one more attempt within the same budget.
5. **No new packages** → commit to `main` → Vercel deploys. **New packages** → PR for approval. **Failure** → GitHub issue; the current design stays live.

**Trust boundary.** Steps 1–4 run in the `design` job, which has the Gemini key
but only a read-only token. The agent can run arbitrary code there, so the
in-CLI hooks are guardrails, not the security boundary. A separate `publish`
job starts from a fresh checkout and holds the write token but no Gemini key.
It accepts only `designs/<date>/` and `public/v/<date>/` from the artifact. It
re-runs the checks on the static build with trusted tooling and recomputes
package approval from `package.json`. It runs git with hooks disabled and never
executes agent-authored Node code.

## Commands

```sh
npm run dev                 # Astro dev server (history, resume, fallback home)
npm run build               # astro build + install latest design as home page
npm run redesign:dry -- --date 2099-01-01   # test the pipeline for free (no Gemini)
npm run redesign -- --date 2026-11-02       # real run (needs GEMINI_API_KEY + gemini CLI)
node redesign/rebuild-latest.mjs            # re-publish the current design after editing data
npm run resume:pdf                          # after build: regenerate public/resume.pdf
```

Inside a design folder, `npm run check` runs the publishing checks and `npm run snap` saves screenshots to `.snap/`.

## Setup

- Repo secret `GEMINI_API_KEY`.
- Settings → Actions → General → Workflow permissions: **Read and write** and **Allow GitHub Actions to create and approve pull requests**.
- Optional: create a `redesign` label for PRs.
