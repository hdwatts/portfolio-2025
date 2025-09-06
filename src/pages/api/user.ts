export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../db/supabase";

export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url); // create a proper URL object
	const username = url.searchParams.get("username");
	console.log(request.url, url, url.searchParams);
	if (!username) {
		return new Response("No username provided", { status: 400 });
	}

	const { error, data } = await supabase
		.from("users")
		.select("*")
		.eq("username", username);

	if (error) {
		return new Response(error.message, { status: 500 });
	}

	return new Response(JSON.stringify(data), {
		status: 200,
	});
};
