// Дашборд викладача: групи, прочитані пари, студенти, журнал оцінок і відвідуваності.
// Дані зберігаються у site/data/dashboard.json через локальний API (/api/dashboard).

const meta = JSON.parse(document.getElementById('dash-meta').textContent);
const MODULES = meta.modules; // [{ id, num, title, semester }]
const PAIRS = meta.pairs; // [{ id, module, title, type, label, short, n, variant, href }]
const moduleById = Object.fromEntries(MODULES.map((m) => [m.id, m]));
const pairsOf = (mid) => PAIRS.filter((p) => p.module === mid);

const root = document.getElementById('dash');
let db = null;
let status = 'saved';
let saveTimer = null;
let current = null; // { g, mod } — для швидкого оновлення журналу без перемальовування

/* ---------- утиліти ---------- */
const esc = (s) =>
	String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (d) => (d ? new Date(`${d}T00:00`).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : '');
const fmtAvg = (a) => (a == null ? '—' : a.toFixed(1).replace('.', ','));
const q = (params) => {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
	return p.toString();
};
const route = () => {
	const p = new URLSearchParams(location.hash.slice(1));
	return { g: p.get('g'), tab: p.get('tab') || 'journal', m: p.get('m') };
};
const go = (params) => (location.hash = q(params));
const sortedStudents = (g) => g.students.slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));

function normalizeGroup(g) {
	g.students ??= [];
	g.modules ??= [];
	g.delivered ??= {};
	g.journal ??= {};
	return g;
}

/* ---------- статистика ---------- */
const cell = (g, pid, sid) => g.journal[pid]?.[sid] ?? '';

function studentStats(g, sid, pairs) {
	let sum = 0, cnt = 0, abs = 0;
	for (const p of pairs) {
		const v = cell(g, p.id, sid);
		if (v === 'н') abs++;
		else if (v !== '') { sum += Number(v); cnt++; }
	}
	return { avg: cnt ? sum / cnt : null, abs };
}

function avgOf(values) {
	const nums = values.filter((v) => v !== '' && v !== 'н').map(Number);
	return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}
const colAvg = (g, pid) => avgOf(g.students.map((s) => cell(g, pid, s.id)));
const groupAvg = (g, pairs) => avgOf(pairs.flatMap((p) => g.students.map((s) => cell(g, p.id, s.id))));

function progress(g, mid) {
	const ps = pairsOf(mid);
	const done = ps.filter((p) => g.delivered[p.id]).length;
	return { done, total: ps.length, pct: ps.length ? Math.round((done / ps.length) * 100) : 0 };
}

const gradeClass = (v) => {
	if (v === 'н') return 'is-abs';
	if (v === '') return '';
	const n = Number(v);
	return n >= 10 ? 'g-high' : n >= 7 ? 'g-mid' : n >= 4 ? 'g-low' : 'g-bad';
};

/* ---------- збереження ---------- */
const STATUS_TEXT = { saving: 'Збереження…', saved: 'Збережено', error: 'Помилка збереження' };
const statusHtml = () => `<span class="d-status" data-status="${status}">${STATUS_TEXT[status]}</span>`;

function setStatus(s) {
	status = s;
	document.querySelectorAll('.d-status').forEach((el) => {
		el.dataset.status = s;
		el.textContent = STATUS_TEXT[s];
	});
}

function save() {
	setStatus('saving');
	clearTimeout(saveTimer);
	saveTimer = setTimeout(async () => {
		try {
			const r = await fetch('/api/dashboard', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(db),
			});
			if (!r.ok) throw new Error();
			setStatus('saved');
		} catch {
			setStatus('error');
		}
	}, 400);
}

window.addEventListener('beforeunload', (e) => {
	if (status !== 'saved') e.preventDefault();
});

/* ---------- екрани ---------- */
function renderOverview() {
	const cards = db.groups
		.map((g) => {
			const mods = g.modules
				.filter((mid) => moduleById[mid])
				.map((mid) => {
					const m = moduleById[mid];
					const { done, total, pct } = progress(g, mid);
					return `<div class="g-mod">
						<div class="g-mod-top"><span>Модуль ${m.num}. ${esc(m.title)}</span><span>${done}/${total}</span></div>
						<div class="bar"><span style="width:${pct}%"></span></div>
					</div>`;
				})
				.join('');
			const avg = groupAvg(g, g.modules.flatMap(pairsOf));
			return `<a class="g-card" href="#${q({ g: g.id })}">
				<div class="g-card-head"><span class="g-name">${esc(g.name)}</span><span class="muted">${g.students.length} студ.</span></div>
				${mods || '<p class="muted small">Модулі не обрано</p>'}
				<div class="g-foot"><span class="muted">Середній бал</span><b>${fmtAvg(avg)}</b></div>
			</a>`;
		})
		.join('');

	return `
		<div class="d-head">
			<p class="muted">Групи, прочитані пари, журнал оцінок і відвідуваності.</p>
			<div class="d-actions">${statusHtml()}<button class="btn btn-primary" data-act="new-group">+ Нова група</button></div>
		</div>
		${
			db.groups.length
				? `<div class="g-grid">${cards}</div>`
				: `<div class="d-empty"><p>Ще немає жодної групи.</p><button class="btn btn-primary" data-act="new-group">Створити першу групу</button></div>`
		}`;
}

function renderGroup(g, r) {
	const mod = g.modules.includes(r.m) ? r.m : g.modules[0];
	current = { g, mod };
	const tab = ['journal', 'pairs', 'students'].includes(r.tab) ? r.tab : 'journal';

	const head = `
		<a class="d-back" href="#">← Усі групи</a>
		<div class="d-head">
			<div><h2 class="d-title">${esc(g.name)}</h2><p class="muted">${g.students.length} студентів</p></div>
			<div class="d-actions">${statusHtml()}<button class="btn" data-act="edit-group">Налаштування</button></div>
		</div>`;

	if (!mod) {
		return `${head}<div class="d-empty"><p>Для групи ще не обрано жодного модуля.</p>
			<button class="btn btn-primary" data-act="edit-group">Обрати модулі</button></div>`;
	}

	const pills =
		g.modules.length > 1
			? `<div class="pills">${g.modules
					.filter((mid) => moduleById[mid])
					.map((mid) => `<a class="pill ${mid === mod ? 'on' : ''}" href="#${q({ g: g.id, tab, m: mid })}">Модуль ${moduleById[mid].num}. ${esc(moduleById[mid].title)}</a>`)
					.join('')}</div>`
			: `<p class="muted small">Модуль ${moduleById[mod].num}. ${esc(moduleById[mod].title)}</p>`;

	const { done, total } = progress(g, mod);
	const tabs = [
		['journal', 'Журнал'],
		['pairs', `Пари <span>${done}/${total}</span>`],
		['students', `Студенти <span>${g.students.length}</span>`],
	]
		.map(([k, l]) => `<a class="tab ${k === tab ? 'on' : ''}" href="#${q({ g: g.id, tab: k, m: mod })}">${l}</a>`)
		.join('');

	const body = tab === 'journal' ? journalHtml(g, mod) : tab === 'pairs' ? pairsHtml(g, mod) : studentsHtml(g, mod);
	return `${head}${pills}<nav class="tabs">${tabs}</nav>${body}`;
}

function journalHtml(g, mod) {
	const ps = pairsOf(mod);
	const st = sortedStudents(g);
	if (!ps.length) return `<div class="d-empty"><p>У цьому модулі ще немає пар.</p></div>`;
	if (!st.length)
		return `<div class="d-empty"><p>У групі ще немає студентів.</p>
			<a class="btn btn-primary" href="#${q({ g: g.id, tab: 'students', m: mod })}">Додати студентів</a></div>`;

	const th = ps
		.map((p) => {
			const d = g.delivered[p.id];
			return `<th class="c-pair ${d ? 'done' : ''}" data-col="${p.id}" title="${esc(`${p.label} ${p.n}. ${p.title}`)}">
				<span class="ph ph--${p.variant}">${p.short}${p.n}</span><span class="pd">${d ? fmtDate(d) : '—'}</span>
			</th>`;
		})
		.join('');

	const rows = st
		.map((s, ri) => {
			const { avg, abs } = studentStats(g, s.id, ps);
			const cells = ps
				.map((p, ci) => {
					const v = cell(g, p.id, s.id);
					return `<td class="c-cell ${g.delivered[p.id] ? 'done' : ''}"><input class="gi ${gradeClass(v)}" value="${esc(v)}"
						data-r="${ri}" data-c="${ci}" data-pid="${p.id}" data-sid="${s.id}" maxlength="2" autocomplete="off"
						aria-label="${esc(`${s.name}, ${p.short}${p.n}`)}"></td>`;
				})
				.join('');
			return `<tr data-sid="${s.id}"><td class="c-num">${ri + 1}</td><td class="c-name" title="${esc(s.name)}">${esc(s.name)}</td>${cells}
				<td class="c-avg" data-avg>${fmtAvg(avg)}</td><td class="c-abs" data-abs>${abs || ''}</td></tr>`;
		})
		.join('');

	const foot = ps.map((p) => `<td data-colavg="${p.id}">${fmtAvg(colAvg(g, p.id))}</td>`).join('');

	return `
		<p class="muted small d-hint">Введи оцінку <b>1–12</b> або <b>н</b> для відсутніх. Enter і стрілки — переміщення між клітинками.
		Перша оцінка автоматично позначає пару прочитаною.</p>
		<div class="j-wrap"><table class="journal">
			<thead><tr><th class="c-num">№</th><th class="c-name">Студент</th>${th}<th class="c-avg">Сер.</th><th class="c-abs" title="Пропуски">Н</th></tr></thead>
			<tbody>${rows}</tbody>
			<tfoot><tr><td class="c-num"></td><td class="c-name">Середній по групі</td>${foot}<td class="c-avg" data-gavg>${fmtAvg(groupAvg(g, ps))}</td><td class="c-abs"></td></tr></tfoot>
		</table></div>`;
}

function pairsHtml(g, mod) {
	const ps = pairsOf(mod);
	if (!ps.length) return `<div class="d-empty"><p>У цьому модулі ще немає пар.</p></div>`;
	const { done, total, pct } = progress(g, mod);
	const items = ps
		.map((p) => {
			const d = g.delivered[p.id];
			return `<li class="p-row ${d ? 'done' : ''}">
				<label class="p-check">
					<input type="checkbox" data-deliver="${p.id}" ${d ? 'checked' : ''}>
					<span class="p-badge ph--${p.variant}">${p.label} ${p.n}</span>
					<span class="p-title">${esc(p.title)}</span>
				</label>
				<input type="date" class="p-date" data-date="${p.id}" value="${d || ''}" ${d ? '' : 'disabled'} aria-label="Дата">
				<a class="p-open" href="${p.href}" target="_blank" rel="noopener" title="Відкрити матеріал">↗</a>
			</li>`;
		})
		.join('');
	return `
		<div class="prog"><div class="prog-top"><span>Прочитано <b>${done}</b> з ${total}</span><span>${pct}%</span></div>
		<div class="bar"><span style="width:${pct}%"></span></div></div>
		<ul class="p-list">${items}</ul>`;
}

function studentsHtml(g, mod) {
	const ps = pairsOf(mod);
	const st = sortedStudents(g);
	const list = st
		.map((s, i) => {
			const { avg, abs } = studentStats(g, s.id, ps);
			return `<li class="s-row">
				<span class="s-num">${i + 1}</span>
				<input class="s-name" value="${esc(s.name)}" data-rename="${s.id}" aria-label="ПІБ">
				<span class="s-stat" title="Середній бал за модуль">${fmtAvg(avg)}</span>
				<span class="s-stat s-abs" title="Пропуски за модуль">н: ${abs}</span>
				<button class="icon-btn" data-del-student="${s.id}" title="Видалити студента">✕</button>
			</li>`;
		})
		.join('');
	return `
		<div class="s-add">
			<textarea rows="4" data-new-students placeholder="Прізвище Ім'я — кожен студент з нового рядка (можна вставити список)"></textarea>
			<button class="btn btn-primary" data-act="add-students">Додати</button>
		</div>
		${st.length ? `<ol class="s-list">${list}</ol>` : '<p class="muted">Студентів ще немає.</p>'}`;
}

function render() {
	if (!db) return;
	const r = route();
	const g = r.g && db.groups.find((x) => x.id === r.g);
	current = null;
	root.innerHTML = g ? renderGroup(g, r) : renderOverview();
}

/* ---------- діалог групи ---------- */
function openGroupDialog(g) {
	const isNew = !g;
	const selected = new Set(g?.modules ?? []);
	const semesters = new Map();
	for (const m of MODULES) {
		if (!semesters.has(m.semester)) semesters.set(m.semester, []);
		semesters.get(m.semester).push(m);
	}
	const checks = [...semesters]
		.map(
			([sem, list]) => `<div class="sem"><div class="sem-t">${esc(sem)}</div>${list
				.map(
					(m) => `<label class="chk"><input type="checkbox" name="modules" value="${m.id}" ${selected.has(m.id) ? 'checked' : ''}>
						<span>Модуль ${m.num}. ${esc(m.title)} <span class="muted">· ${pairsOf(m.id).length} пар</span></span></label>`
				)
				.join('')}</div>`
		)
		.join('');

	const dlg = document.createElement('dialog');
	dlg.className = 'd-dialog';
	dlg.innerHTML = `<form>
		<h3>${isNew ? 'Нова група' : 'Налаштування групи'}</h3>
		<label class="field"><span>Назва групи</span><input name="name" required value="${esc(g?.name ?? '')}" placeholder="Напр. ПЗ-21"></label>
		<fieldset class="field"><legend>Модулі, які вивчає група</legend>${checks}</fieldset>
		<div class="dlg-actions">
			${isNew ? '' : '<button type="button" class="btn btn-danger" data-del>Видалити групу</button>'}
			<span class="spacer"></span>
			<button type="button" class="btn" data-cancel>Скасувати</button>
			<button type="submit" class="btn btn-primary">${isNew ? 'Створити' : 'Зберегти'}</button>
		</div>
	</form>`;
	document.body.append(dlg);
	dlg.addEventListener('close', () => dlg.remove());
	dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
	dlg.querySelector('[data-del]')?.addEventListener('click', () => {
		if (!confirm(`Видалити групу «${g.name}» разом зі студентами та оцінками? Це не можна скасувати.`)) return;
		db.groups = db.groups.filter((x) => x !== g);
		save();
		dlg.close();
		go({});
	});
	dlg.querySelector('form').onsubmit = (e) => {
		e.preventDefault();
		const fd = new FormData(e.target);
		const name = String(fd.get('name')).trim();
		if (!name) return;
		const chosen = new Set(fd.getAll('modules'));
		const modules = MODULES.filter((m) => chosen.has(m.id)).map((m) => m.id);
		if (isNew) {
			const ng = normalizeGroup({ id: uid(), name, modules });
			db.groups.push(ng);
			save();
			dlg.close();
			go({ g: ng.id, tab: 'students' });
		} else {
			g.name = name;
			g.modules = modules;
			save();
			dlg.close();
			render();
		}
	};
	dlg.showModal();
}

/* ---------- журнал: швидке оновлення ---------- */
function updateJournalStats(pid, sid) {
	if (!current) return;
	const { g, mod } = current;
	const ps = pairsOf(mod);
	const row = root.querySelector(`tr[data-sid="${sid}"]`);
	if (row) {
		const { avg, abs } = studentStats(g, sid, ps);
		row.querySelector('[data-avg]').textContent = fmtAvg(avg);
		row.querySelector('[data-abs]').textContent = abs || '';
	}
	const ca = root.querySelector(`[data-colavg="${pid}"]`);
	if (ca) ca.textContent = fmtAvg(colAvg(g, pid));
	const ga = root.querySelector('[data-gavg]');
	if (ga) ga.textContent = fmtAvg(groupAvg(g, ps));
}

function markDeliveredInHeader(pid, date) {
	const th = root.querySelector(`th[data-col="${CSS.escape(pid)}"]`);
	if (th) {
		th.classList.add('done');
		th.querySelector('.pd').textContent = fmtDate(date);
	}
	root.querySelectorAll(`input[data-pid="${CSS.escape(pid)}"]`).forEach((i) => i.parentElement.classList.add('done'));
}

/* ---------- події ---------- */
root.addEventListener('input', (e) => {
	const t = e.target;
	if (!t.matches('.gi') || !current) return;
	const { g } = current;
	let v = t.value.trim().toLowerCase();
	if (['n', 'h', 'н'].includes(v)) v = 'н';
	const valid = v === '' || v === 'н' || (/^\d{1,2}$/.test(v) && +v >= 1 && +v <= 12);
	const { pid, sid } = t.dataset;
	if (!valid) {
		// недійсне значення (напр. «15») не зберігаємо — клітинка вважається порожньою
		t.className = 'gi is-invalid';
		if (g.journal[pid]?.[sid] !== undefined) {
			delete g.journal[pid][sid];
			updateJournalStats(pid, sid);
			save();
		}
		return;
	}
	if (t.value !== v) t.value = v;
	t.className = `gi ${gradeClass(v)}`;

	if (v === '') {
		if (g.journal[pid]) delete g.journal[pid][sid];
	} else {
		(g.journal[pid] ??= {})[sid] = v;
		if (!g.delivered[pid]) {
			g.delivered[pid] = today();
			markDeliveredInHeader(pid, g.delivered[pid]);
		}
	}
	updateJournalStats(pid, sid);
	save();
});

root.addEventListener('keydown', (e) => {
	const t = e.target;
	if (!t.matches('.gi')) return;
	const moves = { Enter: [1, 0], ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };
	const m = moves[e.key];
	if (!m) return;
	const next = root.querySelector(`.gi[data-r="${+t.dataset.r + m[0]}"][data-c="${+t.dataset.c + m[1]}"]`);
	if (next) {
		e.preventDefault();
		next.focus();
	}
});

root.addEventListener('focusin', (e) => {
	if (e.target.matches('.gi')) e.target.select();
});

root.addEventListener('focusout', (e) => {
	const t = e.target;
	if (t.matches('.gi.is-invalid')) {
		t.value = '';
		t.className = 'gi';
	}
});

root.addEventListener('change', (e) => {
	const t = e.target;
	const g = current?.g;
	if (!g) return;
	if (t.dataset.deliver) {
		if (t.checked) g.delivered[t.dataset.deliver] = today();
		else delete g.delivered[t.dataset.deliver];
		save();
		render();
	} else if (t.dataset.date) {
		if (t.value) {
			g.delivered[t.dataset.date] = t.value;
			save();
		}
	} else if (t.dataset.rename) {
		const s = g.students.find((x) => x.id === t.dataset.rename);
		const name = t.value.trim();
		if (s && name) {
			s.name = name;
			save();
		} else if (s) t.value = s.name;
	}
});

root.addEventListener('click', (e) => {
	const t = e.target.closest('button');
	if (!t) return;
	const act = t.dataset.act;
	if (act === 'new-group') openGroupDialog(null);
	else if (act === 'edit-group' && current) openGroupDialog(current.g);
	else if (act === 'add-students' && current) {
		const g = current.g;
		const ta = root.querySelector('[data-new-students]');
		const existing = new Set(g.students.map((s) => s.name.toLowerCase()));
		const names = ta.value
			.split('\n')
			.map((s) => s.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim()) // прибираємо нумерацію «1.» зі вставлених списків
			.filter((s) => s && !existing.has(s.toLowerCase()) && existing.add(s.toLowerCase()));
		if (!names.length) return;
		g.students.push(...names.map((name) => ({ id: uid(), name })));
		save();
		render();
	} else if (t.dataset.delStudent && current) {
		const g = current.g;
		const s = g.students.find((x) => x.id === t.dataset.delStudent);
		if (!s || !confirm(`Видалити студента «${s.name}» разом з його оцінками?`)) return;
		g.students = g.students.filter((x) => x !== s);
		for (const pid of Object.keys(g.journal)) delete g.journal[pid][s.id];
		save();
		render();
	}
});

window.addEventListener('hashchange', render);

/* ---------- старт ---------- */
(async () => {
	try {
		const r = await fetch('/api/dashboard');
		if (!r.ok) throw new Error();
		db = await r.json();
		db.groups ??= [];
		db.groups.forEach(normalizeGroup);
		render();
	} catch {
		root.innerHTML = `<div class="d-empty">
			<h3>Дашборд працює лише локально</h3>
			<p class="muted">Запусти сайт на своєму комп'ютері (<code>npm --prefix site run dev</code>) і відкрий цю сторінку там.
			Дані зберігаються у файлі <code>site/data/dashboard.json</code>.</p>
		</div>`;
	}
})();
