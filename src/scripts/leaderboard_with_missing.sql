DROP MATERIALIZED VIEW IF EXISTS leaderboard_with_missing;
CREATE MATERIALIZED VIEW leaderboard_with_missing AS WITH given_params AS (
    -- Replace this VALUES list with your inputs (bind params in prod)
    -- date::date, points::int, source_name::text
    SELECT *
    FROM (
            VALUES ('2025-07-17'::date, 1, 'Ten Free Throws'),
                ('2025-07-18'::date, 1, 'Ten Free Throws'),
                ('2025-07-24'::date, 1, 'Ten Free Throws'),
                ('2025-07-24'::date, 1, 'Output Before Input'),
                ('2025-09-02'::date, 1, 'Ten Free Throws'),
                ('2025-09-02'::date, 1, 'Output Before Input'),
                ('2025-09-02'::date, 1, 'Wall Drawing'),
                ('2025-09-02'::date, 1, 'Medicine Ball'),
                ('2025-09-02'::date, 1, 'Read Before Bed'),
                ('2025-09-02'::date, 1, 'Out and Back'),
                ('2025-09-03'::date, 1, 'Ten Free Throws'),
                ('2025-09-03'::date, 1, 'Output Before Input'),
                ('2025-09-03'::date, 1, 'Wall Drawing'),
                ('2025-09-03'::date, 1, 'Medicine Ball'),
                ('2025-09-03'::date, 1, 'Read Before Bed'),
                ('2025-09-03'::date, 1, 'Out and Back')
        ) AS v(date, points, source_name)
),
/* Existing normalization */
normal_points AS (
    SELECT id,
        CASE
            WHEN reason LIKE 'Reversed all points from deleted submission:%' THEN -1
            ELSE points
        END AS points,
        date::date AS date,
        user_id,
        CASE
            WHEN points = -1 THEN REGEXP_REPLACE(
                REPLACE(
                    REPLACE(
                        reason,
                        'Reversed all points from deleted submission: ',
                        ''
                    ),
                    'Removed submission for: ',
                    ''
                ),
                ' \(\d\d\d\d\-\d\d\-\d\d\)',
                ''
            )
            ELSE source_name
        END AS source_name,
        REGEXP_REPLACE(
            REPLACE(reason, 'Retroactive: ', ''),
            ' \(Makeup for \d\d\d\d-\d\d-\d\d\)',
            ''
        ) AS reason
    FROM point_histories
    WHERE (
            date < '2025-09-06'
            OR points < 0
            OR reason LIKE 'Excellence Award%'
        )
        AND reason NOT LIKE '%streak bonus%'
        AND reason NOT LIKE '%Badge rank-up%'
        AND reason NOT LIKE 'Retroactive doubling%'
        AND reason != 'Documented their Ritual'
        AND reason NOT LIKE 'Reversed all points from deleted submission: Choose Your Ritual%'
),
/* Create zero-point rows for missing [date, points, source_name] per user */
missing_points AS (
    SELECT
        /* no original id; synthesize null */
        NULL::bigint AS id,
        gp.points,
        -- do not affect totals
        gp.date,
        u.id AS user_id,
        gp.source_name,
        'MISSING: expected (' || gp.date || ', ' || gp.points || ', ' || gp.source_name || ')' AS reason
    FROM users u
        CROSS JOIN given_params gp
    WHERE NOT EXISTS (
            SELECT 1
            FROM normal_points np
            WHERE np.user_id = u.id
                AND np.date = gp.date
                AND np.source_name = gp.source_name
                AND np.points = gp.points -- match on normalized points
        )
),
/* Use base_points everywhere below instead of normal_points */
base_points AS (
    SELECT *
    FROM normal_points
    UNION ALL
    SELECT *
    FROM missing_points
),
/* Sums (unchanged, but pointed at base_points) */
normal_points_sum AS (
    SELECT user_id,
        SUM(points) AS points
    FROM (
            SELECT user_id,
                CASE
                    WHEN reason = 'Shared their Movie' THEN 101
                    ELSE SUM(points)
                END AS points
            FROM base_points
            GROUP BY user_id,
                reason
        ) summed
    GROUP BY user_id
),
streak_points AS (
    SELECT user_id,
        reason,
        start_date,
        end_date,
        CASE
            WHEN days_in_streak BETWEEN 7 AND 29 THEN 7
            WHEN days_in_streak BETWEEN 30 AND 89 THEN 37
            WHEN days_in_streak BETWEEN 90 AND 364 THEN 127
            WHEN days_in_streak > 364 THEN 487
            ELSE 0
        END AS points
    FROM (
            SELECT user_id,
                reason,
                MIN(d) AS start_date,
                MAX(d) AS end_date,
                COUNT(*) AS days_in_streak
            FROM (
                    SELECT user_id,
                        reason,
                        d,
                        SUM(is_break) OVER (
                            PARTITION BY user_id,
                            reason
                            ORDER BY d ROWS UNBOUNDED PRECEDING
                        ) AS streak_id
                    FROM (
                            SELECT user_id,
                                reason,
                                d,
                                CASE
                                    WHEN d - LAG(d) OVER (
                                        PARTITION BY user_id,
                                        reason
                                        ORDER BY d
                                    ) = 1 THEN 0
                                    ELSE 1
                                END AS is_break
                            FROM (
                                    SELECT DISTINCT user_id,
                                        reason,
                                        date::date AS d
                                    FROM base_points
                                    WHERE (
                                            date > '2025-08-08'
                                            OR reason != 'Pushed the Line'
                                        )
                                )
                        )
                ) grp
            GROUP BY user_id,
                reason,
                streak_id
        ) streaks
    WHERE days_in_streak > 6
),
streak_points_sum AS (
    SELECT user_id,
        SUM(points) AS points
    FROM streak_points
    GROUP BY user_id
),
cumulative_points AS (
    SELECT user_id,
        source_name,
        CASE
            WHEN total_submissions BETWEEN 7 AND 29 THEN 14
            WHEN total_submissions BETWEEN 30 AND 89 THEN 74
            WHEN total_submissions BETWEEN 90 AND 364 THEN 254
            WHEN total_submissions > 364 THEN 974
            ELSE 0
        END AS points
    FROM (
            SELECT user_id,
                source_name,
                SUM(points) AS total_submissions
            FROM (
                    SELECT user_id,
                        source_name,
                        LEAST(SUM(points), 1) AS points
                    FROM base_points
                    WHERE (
                            points = 1
                            OR points = -1
                        )
                        AND reason NOT LIKE 'Excellence%'
                        AND source_name != 'Choose Your Ritual'
                    GROUP BY user_id,
                        date,
                        source_name
                ) p
            GROUP BY user_id,
                source_name
        ) cum_count
    WHERE total_submissions > 6
),
cumulative_points_sum AS (
    SELECT user_id,
        SUM(points) AS points
    FROM cumulative_points
    GROUP BY user_id
),
all_points AS (
    SELECT user_id,
        SUM(points) AS total_points
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
SELECT all_points.*,
    users.*,
    ROW_NUMBER() OVER (
        ORDER BY total_points DESC,
            isru_id ASC NULLS LAST
    ) AS rank
FROM all_points
    JOIN users ON users.id = all_points.user_id
ORDER BY total_points DESC,
    isru_id ASC NULLS LAST;