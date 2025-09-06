export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../db/supabase";

export const GET: APIRoute = async () => {
	const { error, data } = await supabase.from("leaderboard").select("*");

	if (error) {
		return new Response(error.message, { status: 500 });
	}

	return new Response(JSON.stringify(data), {
		status: 200,
	});
};
