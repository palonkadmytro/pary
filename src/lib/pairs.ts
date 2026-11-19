import { getCollection, type CollectionEntry } from 'astro:content';

export type PairType = 'lecture' | 'practice' | 'self' | 'homework';

export const PAIR_TYPES: Record<
	PairType,
	{ label: string; plural: string; short: string; variant: 'note' | 'success' | 'caution' | 'danger'; icon: string }
> = {
	lecture: { label: 'Лекція', plural: 'Лекції', short: 'Лекція', variant: 'note', icon: 'open-book' },
	practice: { label: 'Практична', plural: 'Практичні', short: 'Практ.', variant: 'success', icon: 'laptop' },
	self: { label: 'Самостійна', plural: 'Самостійні', short: 'Сам.', variant: 'caution', icon: 'pencil' },
	homework: { label: 'Домашнє завдання', plural: 'Домашні', short: 'ДЗ', variant: 'danger', icon: 'document' },
};

const dateFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
export const formatDate = (d: Date) => dateFmt.format(d);

export const isModuleId = (id: string) => /^module-\d+$/.test(id);

/** Усі пари модуля, відсортовані за номером пари, потім за назвою файлу */
export async function getPairs(moduleId: string) {
	const docs = await getCollection('docs');
	return docs
		.filter((d) => d.id.startsWith(`${moduleId}/`))
		.sort((a, b) => (a.data.pair ?? 999) - (b.data.pair ?? 999) || a.id.localeCompare(b.id));
}

/** Усі модулі (index-сторінки папок module-N) */
export async function getModules() {
	const docs = await getCollection('docs');
	return docs
		.filter((d) => isModuleId(d.id))
		.sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
}

export function countByType(pairs: CollectionEntry<'docs'>[]) {
	const counts: Partial<Record<PairType, number>> = {};
	for (const p of pairs) if (p.data.type) counts[p.data.type] = (counts[p.data.type] ?? 0) + 1;
	return counts;
}
