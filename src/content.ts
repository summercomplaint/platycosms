/** The page's prose, from the Markdown files in content/ (see content/README.md). Bundled at build time. */
const files = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const get = (path: string): string => {
  const s = files['../content/' + path];
  if (s === undefined) throw new Error('missing content file: content/' + path);
  return s;
};

export const content = {
  intro: (): string[] => Object.keys(files).filter((k) => k.startsWith('../content/intro/')).sort().map((k) => files[k]),
  gluings: (mode: 'outside' | 'inside'): string => get(`gluings/${mode}.md`),
  description: (id: string): string => get(`platycosms/${id}/description.md`),
};
