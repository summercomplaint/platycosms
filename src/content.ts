/** The page's prose, from the Markdown files in content/ (see content/README.md). Bundled at build time. */
const files = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const get = (path: string): string => {
  const s = files['../content/' + path];
  if (s === undefined) throw new Error('missing content file: content/' + path);
  return s;
};

export const content = {
  whatIs: (): string => get('intro/1-what-is-a-platycosm.md'),
  howToRead: (): string => get('intro/2-how-to-read.md'),
  stillConfused: (): string => get('home/still-confused.md'),
  learn: (): string => get('learn/placeholder.md'),
  gluings: (mode: 'outside' | 'inside'): string => get(`gluings/${mode}.md`),
  description: (id: string): string => get(`platycosms/${id}/description.md`),
  /** every file, for checks */
  all: (): string[] => Object.keys(files).filter((k) => !k.endsWith('README.md')).map((k) => files[k]),
};
