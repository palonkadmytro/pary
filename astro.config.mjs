// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import fs from 'node:fs';
import path from 'node:path';
import { dashboardApi } from './src/dashboard/api.mjs';

const isDev = process.argv.includes('dev');

/**
 * Автоматично будуємо бокове меню з папок src/content/docs/module-*.
 * Щоб додати новий модуль — просто створи папку module-N з index.mdx.
 */
function moduleSidebar() {
	const docsDir = path.resolve('src/content/docs');
	const field = (src, name) => src.match(new RegExp(`^${name}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'))?.[1];

	const modules = fs
		.readdirSync(docsDir, { withFileTypes: true })
		.filter((d) => d.isDirectory() && /^module-\d+$/.test(d.name))
		.sort((a, b) => Number(a.name.split('-')[1]) - Number(b.name.split('-')[1]))
		.map((d) => {
			const dir = path.join(docsDir, d.name);
			const files = fs.readdirSync(dir);
			const indexFile = files.find((f) => /^index\.mdx?$/.test(f));
			const src = indexFile ? fs.readFileSync(path.join(dir, indexFile), 'utf8') : '';
			const title = field(src, 'title');
			const hasPairs = files.some((f) => /\.mdx?$/.test(f) && !/^index\./.test(f));
			return {
				semester: field(src, 'semester') ?? 'Інше',
				item: {
					label: `Модуль ${d.name.split('-')[1]}${title ? `. ${title}` : ''}`,
					collapsed: !hasPairs, // порожні модулі згорнуті
					autogenerate: { directory: d.name },
				},
			};
		});

	// групуємо модулі за семестрами, зберігаючи порядок
	const groups = new Map();
	for (const m of modules) {
		if (!groups.has(m.semester)) groups.set(m.semester, []);
		groups.get(m.semester).push(m.item);
	}
	return [...groups].map(([label, items]) => ({ label, items }));
}

// Дашборд з оцінками існує лише локально (npm run dev): у зібраний сайт він не потрапляє.
const dashboardRoute = {
	name: 'dashboard-route',
	hooks: {
		'astro:config:setup': ({ command, injectRoute }) => {
			if (command === 'dev') injectRoute({ pattern: '/dashboard', entrypoint: './src/dashboard/page.astro' });
		},
	},
};

export default defineConfig({
	// адреса на GitHub Pages: https://palonkadmytro.github.io/pary/
	site: 'https://palonkadmytro.github.io',
	base: '/pary',
	vite: { plugins: [dashboardApi()] },
	integrations: [
		dashboardRoute,
		starlight({
			title: 'Мої пари',
			description: 'Конспекти лекцій, практичні, самостійні та домашні завдання',
			logo: { src: './src/assets/logo.svg', replacesTitle: false },
			defaultLocale: 'root',
			locales: { root: { label: 'Українська', lang: 'uk' } },
			customCss: [
				'@fontsource-variable/inter',
				'@fontsource-variable/jetbrains-mono',
				'./src/styles/custom.css',
			],
			components: {
				PageTitle: './src/components/PageTitle.astro',
			},
			routeMiddleware: './src/routeData.ts',
			sidebar: [
				{ label: 'Головна', link: '/' },
				{ label: 'Тести', link: '/tests/' },
				// дашборд видно в меню лише локально
				...(isDev ? [{ label: 'Дашборд', link: '/dashboard/' }] : []),
				...moduleSidebar(),
			],
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			pagination: true,
		}),
	],
});
