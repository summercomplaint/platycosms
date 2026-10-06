/** Edge-class colours (Egan's red, cyan, magenta, yellow, blue, green, then more) and vertex-class colours. */
export const EDGE_COL = ['#e11d1d', '#00bfd0', '#d112d1', '#f0c400', '#1f3fd1', '#18b53a', '#f27a00', '#7a3fd1', '#8a5a2b', '#ff8fb3'];
export const VERT_COL = ['#0c0d10', '#ffffff', '#8b919c', '#c9a227'];
export const edgeColor = (cls: number) => EDGE_COL[cls % EDGE_COL.length];
export const vertColor = (cls: number) => VERT_COL[cls % VERT_COL.length];
