export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../db/supabase";

export const GET: APIRoute = async () => {
	const { error, data } = await supabase.from("leaderboard").select("*");

	const { data: lastUpdatedAt, error: lastUpdatedAtError } = await supabase
		.from("run_data")
		.select("last_ran_at")
		.single();
	if (lastUpdatedAtError) {
		return new Response(lastUpdatedAtError.message, { status: 500 });
	}

	if (error) {
		return new Response(error.message, { status: 500 });
	}

	return new Response(
		JSON.stringify({ data, last_updated_at: lastUpdatedAt.last_ran_at }),
		{
			status: 200,
		},
	);
};
