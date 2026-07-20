// 5x7 dot-matrix glyphs, one string per row, '1' = lit pixel.
export const GLYPHS: Record<string, string[]> = {
	S: ['01110', '10001', '10000', '01110', '00001', '10001', '01110'],
	A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
	H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
	K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
	O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
};

export const LETTER_WIDTH = 5;
export const LETTER_HEIGHT = 7;
export const LETTER_GAP = 1;

// A "lenny face" ( ͡° ͜ʖ ͡°), built by joining sub-patterns per row rather
// than hand-aligning one giant string per row.
const FACE_PAREN_L = ['001', '010', '100', '100', '100', '010', '001'];
const FACE_PAREN_R = ['100', '010', '001', '001', '001', '010', '100'];
const FACE_EYE = ['0111110', '1000001', '1001001', '1001001', '1001001', '1000001', '0111110'];
const FACE_MOUTH = ['00000', '00000', '00100', '00000', '00001', '01110', '00000'];
const FACE_GAP2 = ['00', '00', '00', '00', '00', '00', '00'];
const FACE_GAP3 = ['000', '000', '000', '000', '000', '000', '000'];

const LENNY_FACE_ROWS = Array.from(
	{ length: 7 },
	(_, r) =>
		FACE_PAREN_L[r] +
		FACE_GAP2[r] +
		FACE_EYE[r] +
		FACE_GAP3[r] +
		FACE_MOUTH[r] +
		FACE_GAP3[r] +
		FACE_EYE[r] +
		FACE_GAP2[r] +
		FACE_PAREN_R[r]
);

/** Converts row-strings ('1'/'0') into one boolean[rows] per column. */
function rowsToColumns(rows: string[]): boolean[][] {
	const width = rows[0].length;
	const columns: boolean[][] = [];
	for (let c = 0; c < width; c++) {
		const col: boolean[] = [];
		for (let r = 0; r < rows.length; r++) {
			col.push(rows[r][c] === '1');
		}
		columns.push(col);
	}
	return columns;
}

/** Returns one boolean[7] (on/off per row) per column, letters laid out left to right. */
export function buildTextColumns(text: string): boolean[][] {
	const letters = text.toUpperCase().split('');
	const columns: boolean[][] = [];

	letters.forEach((ch, i) => {
		const glyph = GLYPHS[ch];
		if (glyph) {
			columns.push(...rowsToColumns(glyph));
		}
		if (i < letters.length - 1) {
			for (let g = 0; g < LETTER_GAP; g++) {
				columns.push(new Array(LETTER_HEIGHT).fill(false));
			}
		}
	});

	return columns;
}

export function buildFaceColumns(): boolean[][] {
	return rowsToColumns(LENNY_FACE_ROWS);
}
