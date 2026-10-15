import { describe, expect, it } from 'vitest';
import { cosmHash, parse } from '../src/app/router';

describe('routes', () => {
  it('reads the home and learn pages', () => {
    expect(parse('')).toEqual({ page: 'home' });
    expect(parse('#')).toEqual({ page: 'home' });
    expect(parse('#learn')).toEqual({ page: 'learn' });
    expect(parse('#nonsense')).toEqual({ page: 'home' });
  });
  it('keeps the old platycosm links working', () => {
    expect(parse('#c22')).toEqual({ page: 'cosm', id: 'c22', mode: undefined, anim: undefined });
    expect(parse('#a1m/inside')).toMatchObject({ page: 'cosm', id: 'a1m', mode: 'inside' });
    expect(parse('#c22/outside/anim2@0.5')).toMatchObject({ mode: 'outside', anim: { gen: 1, t: 0.5 } });
    expect(parse('#/c3')).toMatchObject({ page: 'cosm', id: 'c3' });
  });
  it('writes hashes the parser reads back', () => {
    expect(parse(cosmHash('c4', 'inside'))).toMatchObject({ id: 'c4', mode: 'inside' });
    expect(cosmHash('c4', 'outside')).toBe('#c4');
  });
});
