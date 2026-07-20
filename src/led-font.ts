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

/** Returns one boolean[7] (on/off per row) per column, letters laid out left to right. */
export function buildTextColumns(text: string): boolean[][] {
	const letters = text.toUpperCase().split('');
	const columns: boolean[][] = [];

	letters.forEach((ch, i) => {
		const glyph = GLYPHS[ch];
		if (glyph) {
			for (let c = 0; c < LETTER_WIDTH; c++) {
				const col: boolean[] = [];
				for (let r = 0; r < LETTER_HEIGHT; r++) {
					col.push(glyph[r][c] === '1');
				}
				columns.push(col);
			}
		}
		if (i < letters.length - 1) {
			for (let g = 0; g < LETTER_GAP; g++) {
				columns.push(new Array(LETTER_HEIGHT).fill(false));
			}
		}
	});

	return columns;
}
