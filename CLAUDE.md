# Notes for Claude sessions

- Start with `PROGRESS.md` (what is done, what is next) and `NOTES.md` (maths facts, with sources and confidence).
- Commit after each phase and push to `origin/main`. End commit messages with the attribution line the harness gives you.
- Commands: `npm test` (vitest), `npm run typecheck`, `npm run dev`, `npm run build` (dist/), `npm run build:single` (one file, dist-single/index.html).
- Layout: `src/math` (group, analysis with seams, fibration, covers, gluing text), `src/data` (platycosms.ts generators and domains, facts.ts), `src/render` (three.js views), `src/ui` (panel), `tests/`.
- The crab model is CC BY-NC 4.0. Keep its credit in the page footer and README.
- Do not commit the reference material in `.gitignore` (the paper PDF, Egan's page copy).
- Headless visual check on Windows: `npx vite preview --port 4173`, then `scripts/shots.sh <outdir> name=#c22 ...` (see PROGRESS.md for the flags).
- Never claim a maths fact without a source tag in `NOTES.md` (computed by a test / paper table / literature).
- Edit files with the editor tools. Backticks inside `node -e "..."` in bash get executed as commands.
