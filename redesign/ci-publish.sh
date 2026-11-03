#!/usr/bin/env bash
# PUBLISH job (repo-write token, NO Gemini key). Fresh checkout; never builds or
# executes agent-authored Node code. For each date in the downloaded artifact:
#   validate paths -> copy into the tree -> re-verify with trusted tooling ->
#   commit to main, or open a PR when new packages need approval, or open an issue on failure.
set -euo pipefail
IN="${IN:?}"
# Branch to publish to: main for scheduled runs, or the branch a manual run was
# started from (lets you seed designs on a branch and review a Vercel preview).
BASE="${BASE_BRANCH:-main}"
DATE_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
b64() { printf '%s' "$1" | base64 | tr -d '\n'; }
# Hooks disabled; credentials passed per command, never stored.
GIT=(git -c core.hooksPath=/dev/null -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $(b64 "x-access-token:${GH_TOKEN}")")
git config user.name "portfolio-redesign[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"

failures=0
fail() { # date, body-file
	failures=$((failures + 1))
	{ cat "$2"; echo; echo "[Workflow run]($run_url)"; } > "$2.issue"
	gh issue create --title "Weekly redesign $1 failed" --body-file "$2.issue" || true
}

[ -d "$IN" ] || { echo "No artifact to publish."; exit 0; }
for dir in $(find "$IN" -mindepth 1 -maxdepth 1 -type d | sort); do
	d="$(basename "$dir")"
	[[ "$d" =~ $DATE_RE ]] || { echo "Skipping unexpected entry $d"; continue; }
	echo "::group::Publish $d"
	"${GIT[@]}" checkout -q "$BASE" && "${GIT[@]}" pull -q --rebase origin "$BASE"

	if [ -f "$dir/failure.md" ]; then fail "$d" "$dir/failure.md"; echo "::endgroup::"; continue; fi

	# Only regular files under designs/ and v/ (plus the two metadata files) are accepted.
	bad="$(find "$dir" -mindepth 1 ! -type f ! -type d; find "$dir" -mindepth 1 -maxdepth 1 ! -name designs ! -name v ! -name result.json ! -name summary.md)"
	if [ -n "$bad" ] || [ -e "designs/$d" ] || [ -e "public/v/$d" ]; then
		printf 'Rejected artifact for %s (unexpected entries, or the date already exists):\n```\n%s\n```\n' "$d" "$bad" > "$dir/reject.md"
		fail "$d" "$dir/reject.md"; echo "::endgroup::"; continue
	fi
	mkdir -p "designs/$d" "public/v/$d"
	cp -R "$dir/designs/." "designs/$d/"
	cp -R "$dir/v/." "public/v/$d/"
	rm -rf "designs/$d/node_modules"
	# Rebuild design.json from trusted values (also recomputes package review).
	needs_review="$(node redesign/sanitize-design.mjs "$d")"

	if ! node redesign/verify-published.mjs "$d" > "$dir/verify.txt" 2>&1; then
		{ echo "Design $d passed in the design job but failed independent re-verification:"; echo '```'; cat "$dir/verify.txt"; echo '```'; } > "$dir/reverify.md"
		rm -rf "designs/$d" "public/v/$d"
		fail "$d" "$dir/reverify.md"; echo "::endgroup::"; continue
	fi

	"${GIT[@]}" add "designs/$d" "public/v/$d"
	if [ "$needs_review" = "true" ]; then
		branch="redesign/$d"
		[ "$BASE" = "main" ] || branch="$branch-on-${BASE//\//-}"
		"${GIT[@]}" checkout -q -b "$branch"
		"${GIT[@]}" commit -q -m "Redesign $d (needs package approval)"
		"${GIT[@]}" push -q -f origin "$branch"
		{
			echo "Gemini installed packages outside the approved template, so this week's design needs your approval before it goes live."
			echo
			echo "![desktop](https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${branch}/public/v/$d/_screenshot-desktop.jpg)"
			echo
			cat "$dir/summary.md"
			echo
			echo "Merging deploys it. Closing it skips this week (the current design stays live)."
		} > "$dir/pr.md"
		gh pr create --base "$BASE" --head "$branch" --title "Weekly redesign $d — approve new packages" --body-file "$dir/pr.md"
		"${GIT[@]}" checkout -q "$BASE"
	else
		"${GIT[@]}" commit -q -m "Weekly redesign $d" -m "$(cat "$dir/summary.md")"
		"${GIT[@]}" push -q origin "HEAD:$BASE"
	fi
	echo "::endgroup::"
done
[ "$failures" -eq 0 ] || { echo "$failures redesign(s) failed"; exit 1; }
