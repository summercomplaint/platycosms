/**
 * Edge-class colours (Egan's red, cyan, magenta, yellow, blue, green, then more), brightened to read on a black sky,
 * and vertex-class colours (at most two vertex classes occur, so white and orange; never black on black).
 */
export const EDGE_COL = ['#ff2d2d', '#00e0f0', '#ff3dff', '#ffd60a', '#3d7bff', '#22e04a', '#ff8a00', '#a066ff', '#c98a4b', '#ff9ec4'];
export const VERT_COL = ['#ffffff', '#ff8a00', '#ff9ec4', '#c98a4b'];
export const edgeColor = (cls: number) => EDGE_COL[cls % EDGE_COL.length];
export const vertColor = (cls: number) => VERT_COL[cls % VERT_COL.length];
