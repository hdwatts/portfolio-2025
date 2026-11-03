#!/usr/bin/env bash
# DESIGN job (read-only token, has GEMINI_API_KEY). Runs untrusted agent code,
# so it never holds repo-write credentials. Each date's output goes to $OUT/<date>/:
#   designs/  v/  result.json  summary.md      on success
#   failure.md                                 on failure
# Dates run sequentially in one checkout so later dates see earlier ones (variant de-duplication).
set -euo pipefail
OUT="${OUT:?}"
dates="${DATES:-}"
[ -z "$dates" ] && dates="$(TZ=America/New_York date +%F)"
mkdir -p "$OUT"

for d in ${dates//,/ }; do
	echo "::group::Redesign $d"
	logdir="${RUNNER_TEMP:-/tmp}/redesign-$d"
	args=(--date "$d")
	[ "${DRY_RUN:-false}" = "true" ] && args+=(--dry-run)
	mkdir -p "$OUT/$d"
	if node redesign/run.mjs "${args[@]}"; then
		mkdir -p "$OUT/$d/designs" "$OUT/$d/v"
		cp -R "designs/$d/." "$OUT/$d/designs/"
		cp -R "public/v/$d/." "$OUT/$d/v/"
		cp "$logdir/result.json" "$logdir/summary.md" "$OUT/$d/"
	else
		cp "$logdir/failure.md" "$OUT/$d/failure.md" 2>/dev/null || echo "Redesign $d failed before producing a report." > "$OUT/$d/failure.md"
		rm -rf "designs/$d" "public/v/$d"
	fi
	echo "::endgroup::"
done
