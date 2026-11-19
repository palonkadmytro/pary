import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				/** Тип заняття: lecture | practice | self | homework */
				type: z.enum(['lecture', 'practice', 'self', 'homework']).optional(),
				/** Номер пари в модулі (визначає порядок) */
				pair: z.number().optional(),
				/** Для index-сторінки модуля: «2 курс, 1 семестр» */
				semester: z.string().optional(),
				/** Номер теми за навчальним планом */
				topic: z.number().optional(),
				/** Дата пари */
				date: z.coerce.date().optional(),
				/** Дедлайн (для ДЗ / самостійних) */
				deadline: z.coerce.date().optional(),
				/** Викладач */
				teacher: z.string().optional(),
				/** Прикріплені файли: презентації, PDF, архіви */
				files: z
					.array(z.object({ label: z.string(), href: z.string() }))
					.optional(),
			}),
		}),
	}),
};
