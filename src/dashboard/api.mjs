// Локальний API дашборду: читає й записує site/data/dashboard.json.
// Працює лише в режимі розробки (npm run dev) — у зібраний сайт дані не потрапляють.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));
const FILE = path.join(DATA_DIR, 'dashboard.json');
const BACKUPS = path.join(DATA_DIR, 'backups');
const EMPTY = { version: 1, groups: [] };

function readBody(req) {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', (c) => (body += c));
		req.on('end', () => resolve(body));
		req.on('error', reject);
	});
}

function write(data) {
	fs.mkdirSync(BACKUPS, { recursive: true });
	if (fs.existsSync(FILE)) {
		// одна резервна копія на день + копія попередньої версії
		const daily = path.join(BACKUPS, `${new Date().toISOString().slice(0, 10)}.json`);
		if (!fs.existsSync(daily)) fs.copyFileSync(FILE, daily);
		fs.copyFileSync(FILE, `${FILE}.bak`);
	}
	const tmp = `${FILE}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
	fs.renameSync(tmp, FILE);
}

export function dashboardApi() {
	return {
		name: 'dashboard-api',
		configureServer(server) {
			server.middlewares.use('/api/dashboard', async (req, res) => {
				res.setHeader('Content-Type', 'application/json');
				try {
					if (req.method === 'GET') {
						res.end(fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : JSON.stringify(EMPTY));
					} else if (req.method === 'PUT') {
						const data = JSON.parse(await readBody(req));
						if (!data || !Array.isArray(data.groups)) throw new Error('Невірний формат даних');
						write(data);
						res.end('{"ok":true}');
					} else {
						res.statusCode = 405;
						res.end('{"error":"Method not allowed"}');
					}
				} catch (e) {
					res.statusCode = 400;
					res.end(JSON.stringify({ error: String(e?.message ?? e) }));
				}
			});
		},
	};
}
