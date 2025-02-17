import { defineCollection, z } from "astro:content";

import { glob, file } from "astro/loaders";

const blog = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" }),
	schema: ({ image }) =>
		z.object({
			title: z.string().max(80),
			tags: z
				.array(z.string())
				.transform((val) => val.map((tag) => tag.toLowerCase())),
			slug: z.string(),
			thumbnailUrl: image(),
			isPublished: z.coerce.boolean(),
			datePublished: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			description: z.string(),
		}),
});

const photographs = defineCollection({
	loader: file("./src/assets/photos/photos.json"),
	schema: ({ image }) =>
		z.object({
			slug: z.string(),
			// album: z.string(),
			location: z.string(),
			src: image(),
			title: z.string(),
			description: z.string(),
		}),
});

export const collections = { blog, photographs };
