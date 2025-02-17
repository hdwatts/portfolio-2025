import rss from "@astrojs/rss";
import { getPosts } from "../lib/getPosts";

export async function GET(context: any) {
	const posts = await getPosts();
	return rss({
		title: "Welcome | Howard Dean Watts",
		description:
			"Hey there. I am a software developer based in New York, currently at Chronograph Private Equity, where I lead the development of tools to automate the extraction of unstructured data from our clients.",
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `blog/${post.data.slug}/`,
		})),
	});
}
