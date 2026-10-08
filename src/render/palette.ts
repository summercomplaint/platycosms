/**
 * Edge-class colours (Egan's red, magenta, yellow, blue, then orange and purple), brightened to read on a black sky.
 * No teal and no coral: those are the crab's colours. At most six edge classes occur.
 * Vertex-class colours: at most two vertex classes occur (white and green). Class 0 is white on the dark theme and black on the light one.
 */
export const EDGE_COL = ['#ff2d2d', '#ff3dff', '#ffd60a', '#3d7bff', '#ff8a00', '#9b5cff', '#c98a4b', '#ff9ec4'];
export const VERT_COL = ['#ffffff', '#22e04a', '#ff9ec4', '#c98a4b'];
export const VERT0_LIGHT = '#16161a';
export const edgeColor = (cls: number) => EDGE_COL[cls % EDGE_COL.length];
export const vertColor = (cls: number) => VERT_COL[cls % VERT_COL.length];
