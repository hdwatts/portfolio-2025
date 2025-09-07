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

const populateUser = async (user: IsruUser) => {
	let error = false;
	do {
		error = false;
		try {
			console.log("Populating user", user.username);
			const { data: existingUser } = await supabase
				.from("users")
				.select("id, isru_id")
				.eq("username", user.username)
				.single();
			if (existingUser) {
				console.log(existingUser);
				if ("isru_id" in existingUser && !existingUser.isru_id) {
					await supabase
						.from("users")
						.update({
							isru_id: user.id,
						})
						.eq("id", existingUser.id);
				}
				console.log("Existing user!", existingUser);
				continue;
			}
			console.log("Getting points");
			const points = await getPoints({
				username: user.username,
			});
			const { error, data } = await supabase
				.from("users")
				.insert({
					username: user.username,
					isru_id: user.id,
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
		} catch (e) {
			error = true;
			console.error(e);
		}
	} while (error);
};

const populateDb = async () => {
	await supabase.from("run_data").update({
		is_running: true,
	});
	console.log("Refreshing view");
	const { error } = await supabase.rpc("refresh_view");
	if (error) {
		console.error("View refresh error", error);
		throw new Error("View refresh error", error);
	}
	console.log("View refreshed.");
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
				await populateUser(bandUser);
			}
		} while (bandUsers?.hasMore);
	}
};

type Excellence = {
	userHandle: string;
	excellenceAwardedAt: string;
	excellenceScope: string;
	excellenceCategories: string[];
	submissionDate: string;
	user: number;
};
const excellenceFetch = async ({
	page,
}: {
	page: number;
}): Promise<Excellence[]> => {
	const response = await fetch(
		`https://isrucamp.com/api/activities/daily-submissions/featured_submissions/?limit=10&offset=${page * 10}&excellent_only=true`,
		{ headers },
	);
	return await response.json();
};

const formatDate = (date: Date) => {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${date.getFullYear()}-${month < 10 ? "0" + month : month}-${
		day < 10 ? "0" + day : day
	}`;
};

const checkNewExcellence = async () => {
	let page = 0;
	do {
		console.log("Fetching excellence!");
		const excellencesToCheck = await excellenceFetch({ page });
		page = page + 1;
		for (const excellence of excellencesToCheck) {
			if (excellence.excellenceAwardedAt < "2025-09-06") {
				continue;
			}
			const { data: existingUser } = await supabase
				.from("users")
				.select("id, isru_id")
				.eq("username", excellence.userHandle)
				.single();
			if (!existingUser) {
				console.log(
					"User not found, populating it!",
					excellence.userHandle,
				);
				await populateUser({
					username: excellence.userHandle,
					id: excellence.user,
				});
			} else {
				console.log("Searching for excellence point!", {
					category: excellence.excellenceCategories[0],
					submissionDate: formatDate(
						new Date(excellence.submissionDate),
					),
					test: `Excellence Award: ${excellence.excellenceCategories[0]}%`,
					userId: existingUser.id,
				});
				const {
					data: existingExcellence,
					error: existingExcellenceError,
				} = await supabase
					.from("point_histories")
					.select("id")
					.ilike(
						"reason",
						`Excellence Award: ${excellence.excellenceCategories[0]}%`,
					)
					.gte("date", "2025-09-04")
					.eq("user_id", existingUser.id)
					.single();
				if (!existingExcellence) {
					console.log(
						"No existing excellence point, adding it!",
						existingExcellenceError,
					);
					const points = await getPoints({
						username: excellence.userHandle,
					});
					const excellencePoint = points.find((p) =>
						p.reason.includes(
							`Excellence Award: ${excellence.excellenceCategories[0]}`,
						),
					);
					if (excellencePoint) {
						console.log("Found excellence point!", excellencePoint);
						await supabase.from("point_histories").insert({
							user_id: existingUser.id,
							points: excellencePoint.points,
							date: excellencePoint.formattedDate,
							source_name: excellencePoint.sourceName,
							reason: excellencePoint.reason,
						});
					}
				} else {
					console.log(
						"Existing excellence point found! Not adding it again.",
						existingExcellence,
					);
				}
			}
		}

		const lastExcellence =
			excellencesToCheck[excellencesToCheck.length - 1];
		if (lastExcellence.excellenceAwardedAt < "2025-09-06") {
			page = -1;
		}
	} while (page > -1);
};

try {
	await checkNewExcellence();
	await populateDb();
} catch (error) {
	console.error(error);
} finally {
	await supabase.functions.invoke("refresh_view");
	await supabase.from("run_data").update({
		is_running: false,
		last_ran_at: new Date().toISOString(),
	});
}
