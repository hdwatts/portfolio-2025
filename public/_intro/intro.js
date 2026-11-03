// Home-page intro: past designs flash by on a timeline that runs up to today,
// then the frame expands into the live (current) design underneath.
//
// Injected by redesign/finalize-site.mjs together with a JSON data block
// <script type="application/json" id="hdw-timeline">:
//   { latest, frames: [{ date, desktop, mobile }], labels: { skip, replay, present } }
//
// Plays once per new design per browser. ?intro=1 forces it, ?intro=0 skips it.
// Skipped entirely for prefers-reduced-motion. Frames are shown inside a
// framed window, never full-bleed, so the rapid changes stay below
// photosensitivity flash thresholds.
(() => {
	const root = document.documentElement;
	let T = null;
	try {
		T = JSON.parse(document.getElementById("hdw-timeline")?.textContent ?? "null");
	} catch {}
	const KEY = "hdw-intro-seen";
	if (!T || !T.frames || T.frames.length < 2) return root.classList.remove("hdw-intro");

	const store = {
		get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
		set: (v) => { try { localStorage.setItem(KEY, v); } catch {} },
	};

	const css = `
.hdw-ov{position:fixed;inset:0;z-index:2147483647;background:#09090b;color:#f4f4f5;font:500 13px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;display:grid;place-items:center;overflow:hidden;transition:opacity .45s ease}
.hdw-ov.out{opacity:0;pointer-events:none}
.hdw-win{position:relative;width:min(78vw,calc(66vh * var(--ar)));aspect-ratio:var(--ar);border-radius:14px;overflow:hidden;background:#18181b;box-shadow:0 0 0 1px #ffffff1f,0 30px 80px -20px #000;transition:width .7s cubic-bezier(.7,0,.2,1),border-radius .7s cubic-bezier(.7,0,.2,1),transform .7s cubic-bezier(.7,0,.2,1)}
.hdw-win.full{width:100vw;border-radius:0;transform:translateY(0)}
.hdw-win img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;opacity:0}
.hdw-win img.on{opacity:1}
.hdw-win.jolt{animation:hdw-jolt 90ms steps(2) 1}
@keyframes hdw-jolt{0%{transform:translate(1.5px,-1px)}50%{transform:translate(-1.5px,1px)}100%{transform:none}}
.hdw-bar{position:absolute;left:50%;bottom:clamp(20px,7vh,64px);transform:translateX(-50%);width:min(78vw,720px);transition:opacity .3s}
.hdw-ov.expanding .hdw-bar,.hdw-ov.expanding .hdw-date,.hdw-ov.expanding .hdw-skip{opacity:0}
.hdw-track{position:relative;height:2px;background:#ffffff26;border-radius:2px}
.hdw-fill{position:absolute;left:0;top:0;bottom:0;background:#f4f4f5;border-radius:2px;width:0}
.hdw-tick{position:absolute;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#52525b;transition:background .15s,transform .15s}
.hdw-tick.hit{background:#f4f4f5}
.hdw-tick.now{transform:scale(1.8)}
.hdw-ends{display:flex;justify-content:space-between;margin-top:10px;color:#a1a1aa;font-size:11px;letter-spacing:.06em}
.hdw-date{position:absolute;top:clamp(18px,7vh,64px);left:50%;transform:translateX(-50%);font-size:clamp(20px,3.2vw,34px);letter-spacing:.04em;font-variant-numeric:tabular-nums;transition:opacity .3s}
.hdw-skip{position:absolute;top:16px;right:16px;background:#ffffff14;color:#e4e4e7;border:1px solid #ffffff26;border-radius:999px;padding:7px 14px;font:inherit;cursor:pointer;transition:opacity .3s}
.hdw-skip:hover,.hdw-skip:focus-visible{background:#ffffff2e;outline:none}
.hdw-replay{position:fixed;left:12px;bottom:12px;z-index:2147483600;width:34px;height:34px;border-radius:50%;border:1px solid #ffffff40;background:#09090bb3;color:#f4f4f5;display:grid;place-items:center;cursor:pointer;opacity:.55;backdrop-filter:blur(6px);transition:opacity .2s}
.hdw-replay:hover,.hdw-replay:focus-visible{opacity:1}
@media (prefers-reduced-motion:reduce){.hdw-replay{display:none}}`;

	const el = (tag, cls, attrs = {}) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, attrs);
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

	function addStyles() {
		if (document.getElementById("hdw-intro-css")) return;
		document.head.appendChild(el("style", "", { id: "hdw-intro-css", textContent: css }));
	}

	function addReplayButton() {
		if (document.querySelector(".hdw-replay")) return;
		const b = el("button", "hdw-replay", { type: "button", title: T.labels.replay });
		b.setAttribute("aria-label", T.labels.replay);
		b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
		b.addEventListener("click", () => play(true));
		document.body.appendChild(b);
	}

	let playing = false;
	async function play(force) {
		if (playing) return;
		const q = new URLSearchParams(location.search).get("intro");
		const should = force || q === "1" || (q !== "0" && store.get() !== T.latest);
		if (!should || reduced()) {
			root.classList.remove("hdw-intro");
			addReplayButton();
			return;
		}
		playing = true;
		addStyles();

		const mobile = innerWidth < 700;
		const frames = T.frames.map((f) => ({ ...f, src: (mobile && f.mobile) || f.desktop })).filter((f) => f.src);
		const ar = mobile ? "390/844" : `${innerWidth}/${innerHeight}`;

		const ov = el("div", "hdw-ov");
		ov.setAttribute("role", "presentation");
		ov.style.setProperty("--ar", ar);
		const win = el("div", "hdw-win");
		const date = el("div", "hdw-date", { textContent: frames[0].date });
		const bar = el("div", "hdw-bar");
		const track = el("div", "hdw-track");
		const fill = el("div", "hdw-fill");
		track.appendChild(fill);
		const ends = el("div", "hdw-ends");
		ends.append(el("span", "", { textContent: frames[0].date }), el("span", "", { textContent: T.labels.present }));
		bar.append(track, ends);
		const skip = el("button", "hdw-skip", { type: "button", textContent: T.labels.skip });
		ov.append(date, win, bar, skip);

		// Ticks positioned by real date so gaps in history are visible.
		const t0 = Date.parse(frames[0].date), t1 = Date.parse(frames[frames.length - 1].date);
		const pos = (d) => (t1 === t0 ? 1 : (Date.parse(d) - t0) / (t1 - t0));
		const ticks = frames.map((f) => {
			const t = el("span", "hdw-tick");
			t.style.left = `${pos(f.date) * 100}%`;
			track.appendChild(t);
			return t;
		});

		const imgs = frames.map((f) => {
			const img = el("img", "", { alt: "", decoding: "async", src: f.src });
			win.appendChild(img);
			return img;
		});
		document.body.appendChild(ov);
		root.classList.remove("hdw-intro");

		let skipped = false;
		const finish = () => {
			if (skipped) return;
			skipped = true;
			store.set(T.latest);
			ov.classList.add("out");
			setTimeout(() => ov.remove(), 500);
			removeEventListener("keydown", onKey);
			playing = false;
			addReplayButton();
		};
		const onKey = (e) => e.key === "Escape" && finish();
		skip.addEventListener("click", finish);
		addEventListener("keydown", onKey);

		// Wait (briefly) for frames to load; drop any that fail.
		await Promise.race([
			Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))),
			sleep(1800),
		]);
		const ok = frames.map((_, i) => imgs[i].complete && imgs[i].naturalWidth > 0);

		// Schedule: start slow and accelerate toward the present, about 2.2s total.
		const n = frames.length;
		const raw = frames.slice(0, -1).map((_, i) => 340 - 270 * Math.pow(i / Math.max(1, n - 2), 0.55));
		const scale = Math.min(1, 2200 / raw.reduce((a, b) => a + b, 0));

		let prev = null;
		for (let i = 0; i < n && !skipped; i++) {
			if (!ok[i] && i < n - 1) continue;
			prev?.classList.remove("on");
			imgs[i].classList.add("on");
			prev = imgs[i];
			date.textContent = i === n - 1 ? T.labels.present : frames[i].date;
			ticks.forEach((t, j) => (t.classList.toggle("hit", j <= i), t.classList.toggle("now", j === i)));
			fill.style.width = `${pos(frames[i].date) * 100}%`;
			win.classList.remove("jolt");
			void win.offsetWidth;
			if (i > 0 && i < n - 1) win.classList.add("jolt");
			if (i < n - 1) await sleep(raw[i] * scale);
		}
		if (skipped) return;
		await sleep(450);
		if (skipped) return;
		// Expand the present-day frame to fill the screen, then reveal the live page.
		ov.classList.add("expanding");
		win.style.setProperty("--ar", `${innerWidth}/${innerHeight}`);
		ov.style.setProperty("--ar", `${innerWidth}/${innerHeight}`);
		win.classList.add("full");
		await sleep(720);
		finish();
	}

	const start = () => play(false);
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
	else start();
})();
