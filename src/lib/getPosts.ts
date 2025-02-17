import { getCollection } from "astro:content";

export const getPosts = async () =>
	(await getCollection("blog"))
		.filter((post) => post.data.isPublished || import.meta.env.DEV)
		.sort(
			(a, b) =>
				b.data.datePublished.getTime() - a.data.datePublished.getTime(),
		);
