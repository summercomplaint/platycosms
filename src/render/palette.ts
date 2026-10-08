/**
 * Edge-class colours (Egan's red, magenta, yellow, blue, green, then purple), brightened to read on a black sky.
 * No teal and no coral: those are the crab's colours. At most six edge classes occur.
 * Vertex-class colours: at most two vertex classes occur. Class 0 is white on the dark theme and black on the light one.
 */
export const EDGE_COL = ['#ff2d2d', '#ff3dff', '#ffd60a', '#3d7bff', '#22e04a', '#9b5cff', '#ff8a00', '#c98a4b', '#ff9ec4'];
export const VERT_COL = ['#ffffff', '#ff8a00', '#ff9ec4', '#c98a4b'];
export const VERT0_LIGHT = '#16161a';
export const edgeColor = (cls: number) => EDGE_COL[cls % EDGE_COL.length];
export const vertColor = (cls: number) => VERT_COL[cls % VERT_COL.length];
