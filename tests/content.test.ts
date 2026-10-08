import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { PLATYCOSMS } from '../src/data/platycosms';
import { inline, paragraphs } from '../src/ui/markdown';

describe('page text in content/', () => {
  for (const P of PLATYCOSMS) {
    it(`${P.id} has a description`, () => {
      expect(content.description(P.id).trim().length).toBeGreaterThan(50);
    });
  }
  it('has the intro and both gluing notes', () => {
    expect(content.intro().length).toBe(2);
    expect(content.gluings('outside').trim()).not.toBe('');
    expect(content.gluings('inside').trim()).not.toBe('');
  });
});

describe('the Markdown subset', () => {
  it('escapes HTML and renders bold, italic and links', () => {
    expect(inline('a <b>x</b>')).toBe('a &lt;b&gt;x&lt;/b&gt;');
    expect(inline('**b** and *i*')).toBe('<b>b</b> and <i>i</i>');
    expect(inline('[K](https://en.wikipedia.org/wiki/Klein_bottle)')).toBe('<a href="https://en.wikipedia.org/wiki/Klein_bottle" target="_blank" rel="noopener">K</a>');
    expect(inline('[x](javascript:alert(1))')).not.toContain('href');
  });
  it('splits paragraphs on blank lines and joins wrapped lines', () => {
    expect(paragraphs('one\ntwo\n\nthree')).toBe('<p>one two</p><p>three</p>');
  });
});
