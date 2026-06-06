# opensop-website — Claude Code project guide

The marketing site for opensop.ai. A single-page editorial that turns a curious reader into someone who hands an agent the install + discovery prompts in the hero. Lives at `coba-ai/opensop-website` on GitHub; Cloudflare watches `main` and deploys on merge.

## Stack

- **Source:** one JSX file, `src/editorial.jsx` (~37 KB). No React Router, no client-side routing, no framework — vanilla DOM with a small `useState2`/`useEffect2` shim.
- **Build:** Babel compiles JSX → `assets/editorial.js`. `scripts/cache-bust.mjs` rewrites the `?v=<hash>` query string in `index.html`. Single command: `npm run build`.
- **Styling:** **custom CSS, not Tailwind.** All visual identity lives in `assets/editorial.css` (~36 KB) via 134 distinct `ed-*` classes — see the Conventions section.
- **Fonts (Google):** Inter (sans), JetBrains Mono (mono), Source Serif 4 (serif/italic).
- **Hero asset:** `assets/hero-illustration.jpg` — watercolor, preloaded with `fetchpriority="high"`.
- **Deploy:** Cloudflare Pages watching `main`. No CI, no test suite. Visual verification + manual.

## Commands

```bash
npm install                                       # one-time
npm run build                                     # babel src/editorial.jsx → assets/editorial.js + cache-bust
python3 -m http.server 8000                       # serve locally for visual check (no build watcher)
open http://localhost:8000                        # or use the Playwright MCP for headless verification
```

There is no `dev`, no watch mode. Edit → rebuild → reload.

## Architecture

**One page, one source file.** `src/editorial.jsx` declares a single `EditorialPage` component composed of sections (hero, why-we-built, how-it-works, runtimes-table, examples, closing CTA). Section components live inline in the same file; there is no `src/components/` directory. This is deliberate — easy to grep, easy to reason about, trivially diff-able.

**Cache-bust contract.** Every successful build updates both the JS file and the `?v=<hash>` query in `index.html`. **Editing JSX without running `npm run build` is the most common failure mode** — the deploy ships stale JS. Both must be committed together.

**Audience.** The site speaks to one ICP: engineers and technical PMs who build agent-driven systems and have been burned by LLM nondeterminism. The hero hands them an agent prompt; the body explains the harness; the closing converts to GitHub stars or install.

**Voice (post 2026-05-29 reframe).** Visceral, honest. The hero said "We got tired of agents lying to us, so we built them a harness" for a reason. Don't oversell, don't reintroduce "portable runtime" framing for the CLI, don't write marketing slop. When unsure, lean technical and concrete.

## Conventions

**CSS naming — the `ed-` prefix.** All custom classes are prefixed `ed-` (editorial). Examples: `ed-hero`, `ed-hero-paste`, `ed-paste-eb`, `ed-paste-code`, `ed-paste-copy`, `ed-quote`, `ed-italic`, `ed-runtimes-table`, `ed-section-mvp`, `ed-cta`. Naming pattern: `ed-<section>` or `ed-<element>-<variant>`. **Never introduce non-prefixed custom classes** — they collide with future utilities.

**Editing styles.** `assets/editorial.css` is hand-maintained, not generated. Edit it directly. When adding a new visual element, add the JSX in `editorial.jsx` and the CSS in `editorial.css` in the same PR.

**Responsive.** Mobile-first. Breakpoints in `editorial.css` use `@media (min-width: <px>)`. Test every change at 375px, 768px, and 1280px before declaring done. Hero must remain legible on mobile (375px); the runtimes table must reflow, not horizontal-scroll.

**Icons.** Inline SVG or single-glyph unicode (▷, ⌘, ★). No icon font, no Heroicons dependency. Keep the markup readable.

**Italic for emphasis.** Use `<span className="ed-italic">word</span>` (Source Serif 4 italic) for emotional accents. One per heading, max. Don't sprinkle.

**Voice/copy guardrails.** When writing copy, run it past the auditor checklist in the parent `CLAUDE.md`: no PII, no internal names, no overclaiming. The site is read by strangers; every line is permanent.

## Workflow

1. Branch off `main` in a worktree (or just a feature branch — repo is small):
   ```sh
   git switch -c docs/<short-name>     # or feat/, fix/, copy/, hero/
   ```
2. Edit `src/editorial.jsx` (and `assets/editorial.css` if visuals change).
3. **`npm run build`** — non-negotiable. This regenerates `assets/editorial.js` and updates the cache-bust hash in `index.html`.
4. Serve locally (`python3 -m http.server`) and visually verify at 375 / 768 / 1280px. Use the Playwright MCP for screenshots and accessibility snapshots.
5. Commit `src/editorial.jsx`, `assets/editorial.js`, `assets/editorial.css` (if touched), and `index.html` together. Stale JS is the #1 regression source.
6. Push and open a PR with `gh pr create`. PR description includes: summary, screenshots at the relevant breakpoint, cache-bust hash, and what was visually verified.
7. Cloudflare auto-deploys on merge to `main`.

Branch naming convention: `docs/`, `feat/`, `fix/`, `copy/` (for copy edits), `hero/` (for hero changes).

## Footguns

- **The babel rebuild trap.** Editing JSX without `npm run build` ships stale JS. Two recent PRs (#14 and a near-miss on #15) tripped on this. Always rebuild + commit `assets/editorial.js` + the updated `index.html` hash.
- **Cache-bust hash must match.** `scripts/cache-bust.mjs` writes the new hash to `index.html`. If you build but don't commit `index.html`, browsers cache the old JS.
- **Playwright strict-mode selector collisions.** `section.ed-hero` may match more than one element (preloaded thumbnail templates). Use `.first()` or a more specific selector.
- **Favicon 404 on localhost.** `<link rel="icon">` points at `opensop.ai/favicon.ico`. Console shows a 404 when serving from `localhost`. Harmless, ignore.
- **Mobile reflow on the runtimes table.** Adding columns will break it below 768px. Test before adding.
- **`HANDOFF.md` is older context.** Useful for understanding original intent; don't treat it as current truth.

## When you're touching this repo from the orchestrator

The site mirrors claims that live in the runtime's README and SPEC. If a hero or section change makes a claim about behavior (latency, audit guarantees, step types), verify against `../opensop/SPEC.md` and `../opensop/README.md` before merging. If they disagree, fix the disagreement — don't ship divergence.
