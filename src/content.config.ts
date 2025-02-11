import { defineCollection, z } from "astro:content";

import { glob, file } from "astro/loaders";

const blog = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" }),
	schema: () => z.object({
		title: z.string().max(80),
		tags: z.array(z.string()),
		slug: z.string(),
		thumbnailUrl: z.string(),
		isPublished: z.coerce.boolean(),
		datePublished: z
			.string()
			.or(z.date())
			.transform((val) => new Date(val)),
		description: z.string(),
	}),
});

export const collections = { blog };
