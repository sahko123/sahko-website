// Static, unbundled script (served as-is from /led-header.js) so the browser
// downloads and caches it once instead of getting a fresh inlined copy on
// every page. Mirrors src/led-font.ts + the script from
// src/components/LedHeader.astro — keep both in sync if you change one.

const GLYPHS = {
	S: ['01110', '10001', '10000', '01110', '00001', '10001', '01110'],
	A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
	H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
	K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
	O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
};

const LETTER_WIDTH = 5;
const LETTER_HEIGHT = 7;
const LETTER_GAP = 1;

const FACE_PAREN_L = ['001', '010', '100', '100', '100', '010', '001'];
const FACE_PAREN_R = ['100', '010', '001', '001', '001', '010', '100'];
const FACE_EYE = ['0111110', '1000001', '1000001', '1001001', '1000001', '1000001', '0111110'];
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

function rowsToColumns(rows) {
	const width = rows[0].length;
	const columns = [];
	for (let c = 0; c < width; c++) {
		const col = [];
		for (let r = 0; r < rows.length; r++) {
			col.push(rows[r][c] === '1');
		}
		columns.push(col);
	}
	return columns;
}

function buildTextColumns(text) {
	const letters = text.toUpperCase().split('');
	const columns = [];

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

function buildFaceColumns() {
	return rowsToColumns(LENNY_FACE_ROWS);
}

const ROWS = LETTER_HEIGHT;
const ORANGE = '255,140,0';
const BASE_ALPHA = 0.06;
const SWEEP_MS = 1800;
const HALF_BAND = 28; // columns of falloff on either side of the wave's center
const SPARK_TAU = 90; // ms, how fast an un-reignited spark fades
const LOCK_TAU = 90; // ms, how fast a lit/passed column settles to its final state
const LOCK_TAIL = 400; // ms, extra time after the sweep for the lock-in to converge
const MIN_CELL_SIZE = 1;
const STORAGE_KEY = 'sahko:led-header-played';

const wrap = document.querySelector('.led-header');
const canvas = document.getElementById('led-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

if (wrap && canvas && ctx) {
	const letterCols = buildTextColumns('SAHKO');
	const faceCols = buildFaceColumns();
	const minGlyphCols = Math.max(letterCols.length, faceCols.length);

	let currentGlyph = letterCols;
	let showingFace = false;

	let columns = 0;
	let cellSize = 8;
	let gap = 2;
	let offsetX = 0;
	let letterStart = 0;
	let cssWidth = 0;
	let cssHeight = 0;
	let brightness = new Float32Array(0);
	let animationToken = 0;
	let isAnimating = false;

	function metricsFor(width) {
		if (width < 400) return { size: 5, gap: 1 };
		if (width < 640) return { size: 6, gap: 2 };
		if (width < 1024) return { size: 8, gap: 2 };
		return { size: 10, gap: 3 };
	}

	function layout() {
		const width = wrap.clientWidth;
		const m = metricsFor(width);

		const maxPitch = Math.max(1, Math.floor(width / minGlyphCols));
		const pitch = Math.min(m.size + m.gap, maxPitch);
		gap = Math.min(m.gap, Math.max(0, pitch - 1));
		cellSize = Math.max(MIN_CELL_SIZE, pitch - gap);

		columns = Math.max(minGlyphCols, Math.floor((width + gap) / (cellSize + gap)));
		letterStart = Math.floor((columns - currentGlyph.length) / 2);

		cssWidth = width;
		cssHeight = ROWS * (cellSize + gap) - gap;
		offsetX = Math.max(0, (width - (columns * (cellSize + gap) - gap)) / 2);

		const dpr = window.devicePixelRatio || 1;
		canvas.width = cssWidth * dpr;
		canvas.height = cssHeight * dpr;
		canvas.style.height = `${cssHeight}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		brightness = new Float32Array(columns * ROWS).fill(BASE_ALPHA);
	}

	function isLit(col, row) {
		const i = col - letterStart;
		if (i < 0 || i >= currentGlyph.length) return false;
		return currentGlyph[i][row];
	}

	function showGlyph(cols, face) {
		showingFace = face;
		currentGlyph = cols;
		letterStart = Math.floor((columns - cols.length) / 2);
		if (reduceMotion) {
			drawSettled();
		} else {
			playSweep();
		}
	}

	function drawCell(col, row, alpha) {
		const x = offsetX + col * (cellSize + gap);
		const y = row * (cellSize + gap);
		if (alpha > 0.4) {
			ctx.shadowColor = `rgba(${ORANGE}, ${Math.min(alpha, 1)})`;
			ctx.shadowBlur = cellSize * 1.1;
		} else {
			ctx.shadowBlur = 0;
		}
		ctx.fillStyle = `rgba(${ORANGE}, ${alpha.toFixed(3)})`;
		if (typeof ctx.roundRect === 'function') {
			ctx.beginPath();
			ctx.roundRect(x, y, cellSize, cellSize, Math.min(2, cellSize / 3));
			ctx.fill();
		} else {
			ctx.fillRect(x, y, cellSize, cellSize);
		}
	}

	function drawSettled() {
		ctx.clearRect(0, 0, cssWidth, cssHeight);
		for (let c = 0; c < columns; c++) {
			for (let r = 0; r < ROWS; r++) {
				drawCell(c, r, isLit(c, r) ? 1 : BASE_ALPHA);
			}
		}
		ctx.shadowBlur = 0;
	}

	function playSweep() {
		const token = ++animationToken;
		isAnimating = true;
		const start = performance.now();
		const totalRuntime = SWEEP_MS + LOCK_TAIL;
		let lastTime = start;

		function frame(now) {
			if (token !== animationToken) return; // superseded (e.g. a resize)
			if (reduceMotion) {
				drawSettled();
				sessionStorage.setItem(STORAGE_KEY, '1');
				isAnimating = false;
				return;
			}

			const dt = now - lastTime;
			lastTime = now;
			const elapsed = now - start;

			const span = columns + 2 * HALF_BAND;
			const waveCenter = -HALF_BAND + span * Math.min(elapsed / SWEEP_MS, 1);

			ctx.clearRect(0, 0, cssWidth, cssHeight);
			for (let c = 0; c < columns; c++) {
				const d = c - waveCenter;
				for (let r = 0; r < ROWS; r++) {
					const idx = c * ROWS + r;
					const lit = isLit(c, r);

					if (d > HALF_BAND) {
						brightness[idx] = BASE_ALPHA;
					} else if (lit) {
						const proximity = Math.min(1, 1 - d / HALF_BAND);
						const targetNow = BASE_ALPHA + (1 - BASE_ALPHA) * proximity;
						const lock = 1 - Math.exp(-dt / LOCK_TAU);
						brightness[idx] += (targetNow - brightness[idx]) * lock;
					} else if (d >= -HALF_BAND) {
						const density = 1 - Math.abs(d) / HALF_BAND;
						if (Math.random() < density) {
							brightness[idx] = 1;
						} else {
							const decay = Math.exp(-dt / SPARK_TAU);
							brightness[idx] = BASE_ALPHA + (brightness[idx] - BASE_ALPHA) * decay;
						}
					} else {
						const lock = 1 - Math.exp(-dt / LOCK_TAU);
						brightness[idx] += (BASE_ALPHA - brightness[idx]) * lock;
					}

					drawCell(c, r, brightness[idx]);
				}
			}
			ctx.shadowBlur = 0;

			if (elapsed < totalRuntime) {
				requestAnimationFrame(frame);
			} else {
				drawSettled();
				sessionStorage.setItem(STORAGE_KEY, '1');
				isAnimating = false;
			}
		}

		requestAnimationFrame(frame);
	}

	const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	let reduceMotion = motionQuery.matches;
	motionQuery.addEventListener('change', (e) => {
		reduceMotion = e.matches;
	});

	const alreadyPlayed = sessionStorage.getItem(STORAGE_KEY) === '1';

	layout();
	if (reduceMotion || alreadyPlayed) {
		drawSettled();
		sessionStorage.setItem(STORAGE_KEY, '1');
	} else {
		playSweep();
	}

	wrap.addEventListener('mouseenter', () => {
		if (!showingFace) showGlyph(faceCols, true);
	});
	wrap.addEventListener('mouseleave', () => {
		if (showingFace) showGlyph(letterCols, false);
	});

	let resizeTimer;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			animationToken++; // invalidate any in-flight sweep before relayout
			isAnimating = false;
			layout();
			drawSettled();
		}, 150);
	});
}
