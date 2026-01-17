export const prerender = false;

import type { APIRoute } from "astro";

/* The supabase leaderboard view. This query is used to create the 'leaderboard' view in Supabase.
Since this is a view, pagination and search are handled client-side using Supabase methods.
Agent's should feel free to update this query to improve the accuracy of the leaderboard.

CREATE VIEW leaderboard AS 
WITH normal_points AS (
  SELECT
    id,
    CASE WHEN reason LIKE 'Reversed all points from deleted submission:%' THEN -1 ELSE points END as points,
    date,
    user_id,
    CASE WHEN points = -1
    THEN
      REGEXP_REPLACE(
      REPLACE(
        REPLACE(reason,
          'Reversed all points from deleted submission: ',
          ''
        ),
      'Removed submission for: ',''),
      ' \(\d\d\d\d\-\d\d\-\d\d\)', '')
    ELSE source_name
    END as source_name,
    REGEXP_REPLACE(
      REPLACE(reason, 'Retroactive: ', ''),
      ' \(Makeup for \d\d\d\d-\d\d-\d\d\)',
      ''
    ) as reason
  FROM point_histories
  WHERE (date < '2025-09-06' OR points < 0 OR reason LIKE 'Excellence Award%')
    AND reason NOT LIKE '%streak bonus%'
    AND reason NOT LIKE '%Badge rank-up%'
    AND reason NOT LIKE 'Retroactive doubling%'
    AND reason != 'Documented their Ritual'
    AND reason NOT LIKE 'Reversed all points from deleted submission: Choose Your Ritual%'
), normal_points_sum AS (
  SELECT user_id, SUM(points) as points
  FROM (
    SELECT user_id, CASE WHEN reason = 'Shared their Movie' THEN 101 ELSE SUM(points) END as points
    FROM normal_points
    GROUP BY user_id, reason
  ) summed
  GROUP BY user_id
), streak_points AS (
  SELECT user_id,
    reason,
    start_date,
    end_date,
    CASE WHEN
      days_in_streak BETWEEN 7 AND 29 THEN 7
      WHEN days_in_streak BETWEEN 30 AND 89 THEN 37
      WHEN days_in_streak BETWEEN 90 AND 364 THEN 127
      WHEN days_in_streak > 364 THEN 487
      ELSE 0
    END as points
  FROM (
  SELECT
    user_id,
    reason,
    MIN(d) AS start_date,
    MAX(d) AS end_date,
    COUNT(*) AS days_in_streak
  FROM (
      SELECT
        user_id,
        reason,
        d,
        SUM(is_break) OVER (
          PARTITION BY user_id, reason
          ORDER BY d
          ROWS UNBOUNDED PRECEDING
        ) AS streak_id
      FROM (
        SELECT
        user_id,
        reason,
        d,
        CASE
          WHEN d - LAG(d) OVER (PARTITION BY user_id, reason ORDER BY d) = 1
            THEN 0
          ELSE 1
        END AS is_break
      FROM (
        SELECT DISTINCT user_id, reason, date::date AS d
          FROM normal_points
      ))
    ) grp
    GROUP BY user_id, reason, streak_id
  ) streaks
  WHERE days_in_streak > 6
), streak_points_sum AS (
  SELECT user_id, SUM(points) as points
  FROM streak_points
  GROUP BY user_id
), cumulative_points AS (
  SELECT user_id,
  source_name,
  CASE
    WHEN total_submissions BETWEEN 7 AND 29 THEN 14
    WHEN total_submissions BETWEEN 30 AND 89 THEN 74
    WHEN total_submissions BETWEEN 90 AND 364 THEN 254
    WHEN total_submissions > 364 THEN 974
    ELSE 0
  END as points
FROM (
  SELECT user_id, source_name, SUM(points) as total_submissions
  FROM (
    SELECT user_id, source_name, LEAST(SUM(points), 1) as points
    FROM normal_points
    WHERE (points = 1 OR points = -1) AND reason NOT LIKE 'Excellence%' AND source_name != 'Choose Your Ritual'
    GROUP BY user_id, date, source_name
  ) p
  GROUP BY user_id, source_name
) cum_count
WHERE total_submissions > 6
), cumulative_points_sum AS (
  SELECT user_id, SUM(points) as points
  FROM cumulative_points
  GROUP BY user_id
), all_points AS (
  SELECT user_id, SUM(points) as total_points
  FROM (
    SELECT *
    FROM normal_points_sum

    UNION 

    SELECT *
    FROM streak_points_sum

    UNION

    SELECT *
    FROM cumulative_points_sum
  )
  GROUP BY user_id
)

SELECT 
  all_points.*,
  users.*,
  ROW_NUMBER() OVER (ORDER BY total_points DESC, isru_id ASC NULLS LAST) as rank
FROM all_points
JOIN users ON users.id = all_points.user_id
ORDER BY total_points DESC, isru_id ASC NULLS LAST;

-- Note: Pagination and search filtering are handled client-side in the API using:
-- .ilike('username', '%search_term%') for search
-- .range(offset, offset + limit - 1) for pagination
*/

const VALID_VIEWS = ["leaderboard", "leaderboard_with_missing"] as const;
type ViewName = (typeof VALID_VIEWS)[number];

export const GET: APIRoute = async ({ url }) => {
	// Parse query parameters for pagination, search, and view
	const searchParams = new URLSearchParams(url.search);

	// Validate and set view name
	const viewParam = searchParams.get("view");
	const view_name: ViewName = VALID_VIEWS.includes(viewParam as ViewName)
		? (viewParam as ViewName)
		: "leaderboard";


	return new Response(
		JSON.stringify({
			last_updated_at: "2026-01-17T12:00:00Z",
			data: [
				{
					points: 1500,
					username:
						"ISRU League has ended.",
				},
				{
					points: 1400,
					username:
						"My DB hit it's free tier limits, so this experiment is now closed.",
				},
				{
					points: 1300,
					username:
						"Thank you for participating and for a great summer camp!.",
				},
				{
					points: 1200,
					username: "Apologies for any inconvenience, @hdwatts",
				},
			],
		}),
		{ status: 200 },
	);
};
