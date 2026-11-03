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

# --- Agent isolation --------------------------------------------------------
# GitHub's runner user has passwordless sudo, so the agent must NOT run as it.
# Create an unprivileged user that can read (not write) the repo and toolchain;
# run.mjs hands it only the design folder and its own log directory.
if [ "${DRY_RUN:-false}" != "true" ]; then
	AGENT=redesign-agent
	id "$AGENT" >/dev/null 2>&1 || sudo useradd --create-home --shell /usr/sbin/nologin "$AGENT"
	# Traverse-only (o+x) on every parent of the workspace and temp dir, read-only on the repo.
	for p in "$GITHUB_WORKSPACE" "$RUNNER_TEMP"; do
		d="$p"
		while [ "$d" != "/" ]; do sudo chmod o+x "$d"; d="$(dirname "$d")"; done
	done
	chmod -R o+rX "$GITHUB_WORKSPACE"
	sudo chmod o-rwx "$GITHUB_WORKSPACE/.git" # nothing in .git is needed by the agent
	# Sanity: the agent must not be able to sudo or write the repo.
	if sudo -u "$AGENT" sudo -n true 2>/dev/null; then echo "agent user can sudo; refusing to run"; exit 1; fi
	if sudo -u "$AGENT" test -w "$GITHUB_WORKSPACE/redesign/hooks/before-tool.mjs"; then echo "agent user can write the repo; refusing to run"; exit 1; fi
	export REDESIGN_AGENT_USER="$AGENT"
fi

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
		sudo rm -rf "designs/$d" "public/v/$d"
	fi
	# Logs are uploaded as an artifact: remove anything that is not a regular file
	# or directory (a symlink could make the uploader read runner-only files),
	# then make what remains readable.
	# First make sure no agent process is still alive to race the cleanup.
	if [ -n "${REDESIGN_AGENT_USER:-}" ]; then
		for _ in $(seq 1 20); do
			sudo pkill -KILL -u "$REDESIGN_AGENT_USER" || true
			sudo pgrep -u "$REDESIGN_AGENT_USER" >/dev/null || break
			sleep 0.5
		done
		if sudo pgrep -u "$REDESIGN_AGENT_USER" >/dev/null; then echo "agent processes survived; aborting"; exit 1; fi
	fi
	if [ -d "$logdir" ]; then
		sudo find "$logdir" -mindepth 1 ! -type f ! -type d -print -delete || true
		sudo chown -R "$(id -u):$(id -g)" "$logdir"
		chmod -R a+rX "$logdir"
	fi
	# Design output must be plain files only; anything else voids this date.
	if [ -d "$OUT/$d" ] && [ -n "$(find "$OUT/$d" -mindepth 1 ! -type f ! -type d)" ]; then
		rm -rf "$OUT/$d" && mkdir -p "$OUT/$d"
		echo "Rejected: design output for $d contained symlinks or special files." > "$OUT/$d/failure.md"
	fi
	echo "::endgroup::"
done
