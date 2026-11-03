import { data, label, linkify } from "./data";

// Minimal placeholder that passes every publishing check. Replace all of it
// with this week's design.
export function App() {
	const { person, projects } = data;
	return (
		<main className="mx-auto flex max-w-2xl flex-col gap-10 p-8">
			<header className="flex items-center gap-6">
				<img src={person.headshot.src} alt={person.headshot.alt} className="h-20 w-20 rounded-full" />
				<div>
					<h1 className="text-3xl font-bold">{person.name}</h1>
					{person.headline.map((h) => (
						<p key={h}>{linkify(h, "underline")}</p>
					))}
				</div>
			</header>
			<p>{linkify(person.summary, "underline")}</p>

			<section className="flex flex-col gap-6">
				<h2 className="text-xl font-semibold">{label("section.projects")}</h2>
				{projects.map((p) => (
					<article key={p.id} className="flex flex-col gap-2">
						<h3 className="text-lg font-semibold">
							<a href={p.url} className="underline">
								{p.name}
							</a>
						</h3>
						<p>{p.description[0]}</p>
						<div className="flex gap-3">
							{Object.values(p.stores ?? {}).map((s) => (
								<a key={s.url} href={s.url}>
									<img src={s.badge} alt={s.alt} className="h-10 w-auto" />
								</a>
							))}
						</div>
					</article>
				))}
			</section>

			<section className="flex flex-col gap-2">
				<h2 className="text-xl font-semibold">{data.colophon.heading}</h2>
				<p className="font-semibold">{data.colophon.tagline}</p>
				{data.colophon.paragraphs.map((p) => (
					<p key={p}>{linkify(p, "underline")}</p>
				))}
				<div className="flex gap-4 underline">
					{data.colophon.links.map((l) => (
						<a key={l.url} href={l.url}>
							{l.label}
						</a>
					))}
				</div>
			</section>

			<nav className="flex gap-4 underline">
				{person.links.map((l) => (
					<a key={l.url} href={l.url}>
						{l.label}
					</a>
				))}
				<a href="/history">{label("nav.history")}</a>
			</nav>
		</main>
	);
}
