# Page text

Every piece of prose on the page lives in this folder, one small file per piece. Edit them freely.

## Format

- Paragraphs are separated by a blank line.
- `**bold**`, `*italic*`, and links: `[Klein bottle](https://en.wikipedia.org/wiki/Klein_bottle)`.
- Links to another platycosm use its id after a #: `[the torocosm](#c1)` goes to its page. `#learn` is the "still confused?" page and a bare `#` the home page.
- Images in `public/` can be linked by file name: `[this diagram](figure-33.png)` opens it in a new tab.
- That is all. Anything else (HTML, headings) shows up as plain text.

## Files

| File | Where it appears |
|---|---|
| `intro/1-what-is-a-platycosm.md` | home page, left column |
| `intro/2-how-to-read.md` | home page, under the first; also on every platycosm page |
| `home/still-confused.md` | the link box to the learn page, home page |
| `learn/placeholder.md` | the learn page (a placeholder until we write it) |
| `platycosms/<id>/tagline.md` | one line on that space's card on the home page (no links: the card is a link) |
| `gluings/outside.md` | above the list of gluings, outside view |
| `gluings/inside.md` | above the list of gluings, inside view |
| `platycosms/<id>/description.md` | the main description of that space |

The ids are `c1 c2 c3 c4 c6 c22 a1p a1m a2p a2m` (`a1p` is +a1, `a1m` is −a1, and so on).

## Seeing your edits

`npm run dev` and open the page: it reloads as you save. `npm test` checks every file is there and not empty.
The facts in the "More details" box are not here; they live in `src/data/facts.ts` with their sources in `NOTES.md`.
If you add a maths claim to these texts, add its source to `NOTES.md` (section 8a).
