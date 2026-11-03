// Runs synchronously in <head>: hides the page behind a dark cover when the
// intro is about to play, so the live design never flashes first.
(function () {
	try {
		var m = document.querySelector('meta[name="hdw-intro"]');
		if (!m) return;
		var parts = m.content.split("|"), latest = parts[0], frames = Number(parts[1]);
		var q = new URLSearchParams(location.search).get("intro");
		var seen = null;
		try { seen = localStorage.getItem("hdw-intro-seen"); } catch (e) {}
		if (frames > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches && q !== "0" && (q === "1" || seen !== latest)) {
			var r = document.documentElement;
			r.classList.add("hdw-intro");
			setTimeout(function () { r.classList.remove("hdw-intro"); }, 6000);
		}
	} catch (e) {}
})();
