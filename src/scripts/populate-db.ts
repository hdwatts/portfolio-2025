import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log(process.env);

const headers = {
	accept: "application/json, text/plain, */*",
	"accept-language": "en-US,en;q=0.9",
	"cache-control": "no-cache",
	newrelic:
		"eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkJyb3dzZXIiLCJhYyI6IjY4OTM5NzUiLCJhcCI6IjExMjA0MjQ3NDgiLCJpZCI6ImIzZmExNTA5MjY3ZjRjZWEiLCJ0ciI6IjExMzNmZDI3ZDViMjgyZDNlMTAxZjMzOTI0ZTA4MzQ0IiwidGkiOjE3NTcxNjY5MDAzNTd9fQ==",
	pragma: "no-cache",
	priority: "u=1, i",
	"sec-ch-ua":
		'"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
	"sec-ch-ua-mobile": "?0",
	"sec-ch-ua-platform": '"macOS"',
	"sec-fetch-dest": "empty",
	"sec-fetch-mode": "cors",
	"sec-fetch-site": "same-origin",
	traceparent: "00-1133fd27d5b282d3e101f33924e08344-b3fa1509267f4cea-01",
	tracestate:
		"6893975@nr=0-1-6893975-1120424748-b3fa1509267f4cea----1757166900357",
	"x-csrftoken": "JthyQ9I7b8nGe9vLlDpROGDAIGSI8dRh",
	"x-newrelic-id": "Ug4OUl9UDRABVFhUAQMBX1YI",
	cookie: "csrftoken=JthyQ9I7b8nGe9vLlDpROGDAIGSI8dRh; sessionid=ly84t9kedwk9iacv0u6npt2hotp96ttp",
	Referer: "https://isrucamp.com/leaderboard",
};

if (!supabaseUrl || !supabaseKey) {
	throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

type Band = {
	minPoints: number;
	maxPoints: number;
};

const getBands = async (): Promise<{ pointBands: Band[] }> => {
	const response = await fetch(
		"https://isrucamp.com/api/users/leaderboard/stats/?type=points&min_points=151&following_only=false",
		{ headers },
	);
	return await response.json();
};

type BandUserResult = {
	hasMore: boolean;
	users: IsruUser[];
};

const getBandUsers = async ({
	minPoints,
	maxPoints,
	page,
}: {
	minPoints: number;
	maxPoints: number;
	page: number;
}): Promise<BandUserResult> => {
	const data = await fetch(
		`https://isrucamp.com/api/users/leaderboard/band/?min_points=${minPoints}&max_points=${maxPoints}&page=${page}&page_size=10&following_only=false`,
		{ headers },
	);
	return await data.json();
};

type IsruUser = {
	id: number;
	username: string;
};

const getIsruUser = async ({
	username,
}: {
	username: string;
}): Promise<IsruUser> => {
	console.log("Getting user", username);
	const response = await fetch(
		`https://isrucamp.com/api/users/users/profile/${username}/`,
	);
	const data = await response.json();
	console.log("Got user", data.user);
	return data.user;
};

type DbPoints = {
	user_id: number;
	points: number;
	date: string;
	source_name: string;
	reason: string;
};

type Points = {
	points: number;
	formattedDate: string;
	sourceName: string;
	reason: string;
};

type PointsData = {
	next: string | null;
	results: Points[];
};

const fetchPoints = async ({
	username,
	url,
}: {
	username: string;
	url?: string;
}): Promise<PointsData> => {
	const response = await fetch(
		url ?? `https://isrucamp.com/api/rewards/points/history/${username}/`,
	);
	const data = await response.json();
	return data;
};

const getPoints = async ({
	username,
}: {
	username: string;
}): Promise<Points[]> => {
	let url: string | null =
		`https://isrucamp.com/api/rewards/points/history/${username}/`;
	let points: Points[] = [];
	while (url) {
		const pointsData = await fetchPoints({ username, url });
		points = [...points, ...pointsData.results];
		url = pointsData.next;
	}
	return points;
};

const populateDb = async () => {
	await supabase.from("run_data").update({
		is_running: true,
	});
	const { pointBands } = await getBands();
	for (const band of pointBands) {
		let page = 1;
		let bandUsers: BandUserResult | null = null;
		do {
			bandUsers = await getBandUsers({
				minPoints: band.minPoints,
				maxPoints: band.maxPoints,
				page,
			});
			page = page + 1;
			for (const bandUser of bandUsers.users) {
				console.log("Populating user", bandUser.username);
				const { data: existingUser } = await supabase
					.from("users")
					.select("id, isru_id")
					.eq("username", bandUser.username)
					.single();
				if (existingUser) {
					console.log(existingUser);
					if ("isru_id" in existingUser && !existingUser.isru_id) {
						await supabase
							.from("users")
							.update({
								isru_id: bandUser.id,
							})
							.eq("id", existingUser.id);
					}
					console.log("Existing user!", existingUser);
					continue;
				}
				console.log("Getting points");
				const points = await getPoints({
					username: bandUser.username,
				});
				const { error, data } = await supabase
					.from("users")
					.insert({
						username: bandUser.username,
						isru_id: bandUser.id,
					})
					.select();
				const userId = data?.[0]?.id;
				if (!userId) {
					throw new Error("User not found");
				}
				if (error) {
					throw new Error("User error", error);
				}
				const { error: pointsError } = await supabase
					.from("point_histories")
					.insert(
						points.map((i) => ({
							date: i.formattedDate,
							user_id: userId,
							points: i.points,
							source_name: i.sourceName,
							reason: i.reason,
						})),
					);
				console.log("Points Error", pointsError);
				if (pointsError) {
					throw new Error("Points error", pointsError);
				}
			}
		} while (bandUsers?.hasMore);
	}
};

try {
	populateDb();
} catch (error) {
	console.error(error);
} finally {
	await supabase.from("run_data").update({
		is_running: false,
		last_ran_at: new Date().toISOString(),
	});
}
