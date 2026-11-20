// Картки з питаннями: студент обирає картку — відкриваються питання.
const root = document.getElementById('quiz');
const set = JSON.parse(document.getElementById('quiz-data').textContent);
const STORAGE_KEY = `quiz:${set.slug}:v1`;

const grid = root.querySelector('[data-grid]');
const progress = root.querySelector('[data-progress]');
const dialog = root.querySelector('[data-dialog]');
const dialogNum = root.querySelector('[data-num]');
const dialogList = root.querySelector('[data-list]');

const total = set.cards * set.perCard;
const bankSize = set.blocks.reduce((n, b) => n + b.questions.length, 0);

let state = load() ?? { cards: generate(), opened: [] };
let busy = false;

// ---------- генерація карток ----------
function shuffle(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Кожна картка отримує питання з різних тематичних блоків (якщо блоків вистачає).
 * Якщо карток × питань більше, ніж питань у банку, частина питань повторюється,
 * але ніколи двічі на одній картці; кожне питання з банку потрапляє хоча б на одну картку.
 */
function generate() {
	const all = set.blocks.flatMap((b, bi) => b.questions.map((_, qi) => [bi, qi]));
	let pool;
	if (total <= all.length) {
		pool = shuffle(all).slice(0, total);
	} else {
		pool = [...all];
		while (pool.length < total) pool.push(...shuffle(all).slice(0, total - pool.length));
	}
	// групуємо за блоками у випадковому порядку блоків і питань,
	// тоді елементи з кроком set.cards потрапляють на одну картку
	const byBlock = new Map();
	for (const q of shuffle(pool)) {
		if (!byBlock.has(q[0])) byBlock.set(q[0], []);
		byBlock.get(q[0]).push(q);
	}
	const ordered = shuffle([...byBlock.values()]).flat();
	const cards = Array.from({ length: set.cards }, (_, i) =>
		Array.from({ length: set.perCard }, (_, k) => ordered[i + k * set.cards]).sort(
			(a, b) => a[0] - b[0] || a[1] - b[1],
		),
	);
	return shuffle(cards);
}

// ---------- збереження (лише в цьому браузері) ----------
function load() {
	try {
		const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
		const valid =
			s &&
			Array.isArray(s.cards) &&
			s.cards.length === set.cards &&
			s.cards.every(
				(c) => c.length === set.perCard && c.every(([b, q]) => set.blocks[b]?.questions[q] !== undefined),
			);
		return valid ? { cards: s.cards, opened: (s.opened ?? []).filter((i) => i < set.cards) } : null;
	} catch {
		return null;
	}
}

function save() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		/* приватний режим — працюємо без збереження */
	}
}

// ---------- відображення ----------
const TAG_RE = /<(\w+)[^<>]*>[^<]*<\/\1>|<[!/]?[\w-]+[^<>]*>/g;

/** Текст питання: фрагменти HTML-коду показуємо як <code>. */
function renderText(el, text) {
	let last = 0;
	for (const m of text.matchAll(TAG_RE)) {
		el.append(text.slice(last, m.index));
		const code = document.createElement('code');
		code.textContent = m[0];
		el.append(code);
		last = m.index + m[0].length;
	}
	el.append(text.slice(last));
}

function renderGrid() {
	grid.replaceChildren(
		...state.cards.map((_, i) => {
			const btn = document.createElement('button');
			btn.className = 'quiz-card';
			btn.dataset.index = i;
			btn.classList.toggle('is-opened', state.opened.includes(i));
			btn.setAttribute('aria-label', `Картка ${i + 1}`);
			btn.innerHTML = `<span class="quiz-card__num">${i + 1}</span><span class="quiz-card__hint">${
				state.opened.includes(i) ? 'відкрита' : 'обрати'
			}</span>`;
			return btn;
		}),
	);
	progress.textContent = `Відкрито ${state.opened.length} з ${set.cards}`;
}

function openCard(i) {
	if (!state.opened.includes(i)) {
		state.opened.push(i);
		save();
		renderGrid();
	}
	dialogNum.textContent = `№ ${i + 1}`;
	dialogList.replaceChildren(
		...state.cards[i].map(([b, q]) => {
			const li = document.createElement('li');
			const topic = document.createElement('span');
			topic.className = 'quiz-dialog__topic';
			topic.textContent = set.blocks[b].title;
			const text = document.createElement('span');
			text.className = 'quiz-dialog__q';
			renderText(text, set.blocks[b].questions[q]);
			li.append(topic, text);
			return li;
		}),
	);
	root.querySelector('[data-action="next"]').hidden = state.opened.length >= set.cards;
	if (!dialog.open) dialog.showModal();
}

/** Коротка «рулетка» по закритих картках, потім відкриваємо обрану. */
function pickRandom() {
	if (busy) return;
	const closed = state.cards.map((_, i) => i).filter((i) => !state.opened.includes(i));
	if (!closed.length) {
		alert('Усі картки вже відкриті. Натисніть «Перемішати» або «Закрити всі».');
		return;
	}
	if (dialog.open) dialog.close();
	const target = closed[Math.floor(Math.random() * closed.length)];
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const steps = reduce || closed.length === 1 ? 0 : 14;
	busy = true;
	let step = 0;
	const tick = () => {
		grid.querySelector('.is-spinning')?.classList.remove('is-spinning');
		if (step >= steps) {
			busy = false;
			openCard(target);
			return;
		}
		const i = step === steps - 1 ? target : closed[Math.floor(Math.random() * closed.length)];
		grid.querySelector(`[data-index="${i}"]`)?.classList.add('is-spinning');
		step++;
		setTimeout(tick, 50 + step * 12);
	};
	tick();
}

// ---------- події ----------
grid.addEventListener('click', (e) => {
	const card = e.target.closest('.quiz-card');
	if (card && !busy) openCard(Number(card.dataset.index));
});

root.addEventListener('click', (e) => {
	const action = e.target.closest('[data-action]')?.dataset.action;
	if (!action || busy) return;
	if (action === 'random' || action === 'next') pickRandom();
	if (action === 'close') dialog.close();
	if (action === 'reset') {
		state.opened = [];
		save();
		renderGrid();
	}
	if (action === 'shuffle') {
		if (state.opened.length && !confirm('Перемішати питання на всіх картках? Відкриті картки буде закрито.')) return;
		state = { cards: generate(), opened: [] };
		save();
		renderGrid();
		grid.classList.remove('is-shuffled');
		void grid.offsetWidth; // перезапуск анімації
		grid.classList.add('is-shuffled');
	}
});

// клік по затемненому фону закриває картку
dialog.addEventListener('click', (e) => {
	if (e.target === dialog) dialog.close();
});

renderGrid();
console.info(`Тест «${set.title}»: ${set.cards} карток × ${set.perCard} = ${total} місць, у банку ${bankSize} питань.`);
