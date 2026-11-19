#!/usr/bin/env node
// Використання: npm run new -- module-1 lecture "Назва теми"
import fs from 'node:fs';
import path from 'node:path';

const [moduleId, type, ...titleParts] = process.argv.slice(2);
const types = ['lecture', 'practice', 'self', 'homework'];
const title = titleParts.join(' ').trim();

if (!moduleId || !types.includes(type) || !title) {
	console.log('Використання: npm run new -- module-1 <lecture|practice|self|homework> "Назва теми"');
	process.exit(1);
}

const dir = path.resolve('src/content/docs', moduleId);
fs.mkdirSync(dir, { recursive: true });

const nums = fs
	.readdirSync(dir)
	.map((f) => parseInt(f, 10))
	.filter((n) => !Number.isNaN(n));
const pair = (nums.length ? Math.max(...nums) : 0) + 1;
const file = path.join(dir, `${String(pair).padStart(2, '0')}-${type}.md`);
const today = new Date().toISOString().slice(0, 10);

const extra = type === 'homework' || type === 'self' ? `deadline: ${today}\n` : '';
fs.writeFileSync(
	file,
	`---\ntitle: ${title}\ndescription: \ntype: ${type}\npair: ${pair}\ndate: ${today}\n${extra}---\n\n## Мета заняття\n\n`
);
console.log(`✓ Створено ${path.relative(process.cwd(), file)}`);
