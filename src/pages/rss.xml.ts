import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'


export async function GET(context: any) {
	const posts = (await getCollection('blog')).filter(
		(post) => post.data.isPublished || import.meta.env.DEV,
	).sort(
		(a, b) =>
			b.data.datePublished.getTime() - a.data.datePublished.getTime(),
	)
	return rss({
		title: 'Welcome | Howard Dean Watts',
		description: "Hey there. I am a software developer based in New York, currently at Chronograph Private Equity, where I lead the development of tools to automate the extraction of unstructured data from our clients.",
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `blog/${post.data.slug}/`
		}))
	})
}