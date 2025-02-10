import { defineCollection, z } from 'astro:content';

import { glob, file } from 'astro/loaders';

const blog = defineCollection({ 
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/blog" }),
    schema: z.object({
        title: z.string(),
        tags: z.array(z.string()),
        slug: z.string(),
        thumbnailUrl: z.string(),
        isPublished: z.coerce.boolean()
    })
 });

export const collections = { blog };