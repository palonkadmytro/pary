// Набори тестів: кожен JSON у src/tests/sets/ стає сторінкою /tests/<slug>/
export interface TestSet {
	slug: string;
	title: string;
	subtitle?: string;
	module?: string;
	cards: number;
	perCard: number;
	blocks: { title: string; questions: string[] }[];
}

const files = import.meta.glob<{ default: TestSet }>('./sets/*.json', { eager: true });

export const testSets: TestSet[] = Object.values(files)
	.map((f) => f.default)
	.sort((a, b) => a.title.localeCompare(b.title, 'uk'));

export const questionCount = (s: TestSet) => s.blocks.reduce((n, b) => n + b.questions.length, 0);
