import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { getCollection } from 'astro:content';
import { PAIR_TYPES, type PairType } from './lib/pairs';

/**
 * Бокове меню: перед назвою пари ставимо бейдж «Лекція 1», «Практична 3» тощо.
 * Номер рахується окремо для кожного типу всередині модуля (за полем `pair`).
 */
export const onRequest = defineRouteMiddleware(async (context) => {
	const docs = (await getCollection('docs'))
		.filter((d) => d.data.type)
		.sort((a, b) => (a.data.pair ?? 999) - (b.data.pair ?? 999) || a.id.localeCompare(b.id));

	const info = new Map<string, { type: PairType; n: number }>();
	const counters = new Map<string, number>();
	for (const d of docs) {
		const key = `${d.id.split('/')[0]}:${d.data.type}`;
		const n = (counters.get(key) ?? 0) + 1;
		counters.set(key, n);
		info.set(d.id, { type: d.data.type!, n });
	}

	const walk = (entries: any[]) => {
		for (const e of entries) {
			if (e.type === 'group') walk(e.entries);
			else if (e.type === 'link' && !e.badge) {
				const id = decodeURI(e.href).replace(/^\/+|\/+$/g, '');
				const i = info.get(id);
				if (!i) continue;
				const t = PAIR_TYPES[i.type];
				e.badge = { text: `${t.label === 'Домашнє завдання' ? 'ДЗ' : t.label} ${i.n}`, variant: t.variant };
				e.attrs = { ...e.attrs, title: e.label, class: `${e.attrs?.class ?? ''} pair-link`.trim() };
			}
		}
	};
	walk(context.locals.starlightRoute.sidebar);
});
