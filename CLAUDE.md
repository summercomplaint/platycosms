# Notes for Claude sessions

- Start with `PROGRESS.md` (what is done, what is next) and `NOTES.md` (maths facts, with sources and confidence).
- Commit after each phase and push to `origin/main`. End commit messages with the attribution line the harness gives you.
- Commands (once phase 1 is done): `npm test`, `npm run dev`, `npm run build`, `npm run build:single`.
- Do not commit the reference material in `.gitignore` (the paper PDF, Egan's page copy).
- Headless visual check on Windows: `msedge --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --window-size=1300,860 --virtual-time-budget=6000 --screenshot=out.png file:///.../index.html#c22`.
- Never claim a maths fact without a source tag in `NOTES.md` (computed by a test / paper table / literature).
