import { data, label, linkify } from "./data";
import { MoveRight } from "lucide-react";

export function App() {
	const { person, projects, experience, skills, colophon, testimonials, writing } = data;

	return (
		<main className="mx-auto flex max-w-2xl flex-col gap-24 p-6 py-16 md:p-12">
			
			<header className="flex flex-col gap-10 items-center text-center">
				<div className="clay p-2 rounded-full overflow-hidden w-40 h-40">
					<img 
						src={person.headshot.src} 
						alt={person.headshot.alt} 
						className="w-full h-full object-cover rounded-full mix-blend-luminosity opacity-90 grayscale contrast-125 brightness-75 sepia-[.3] hue-rotate-[-30deg]" 
					/>
				</div>
				<div className="flex flex-col gap-6 items-center">
					<h1>{person.name}</h1>
					<div className="flex flex-col gap-2 items-center opacity-80">
						{person.headline.map((h) => (
							<p key={h} className="font-bold">{linkify(h, "underline decoration-amber-500/50 hover:decoration-amber-500")}</p>
						))}
					</div>
					<div className="flex flex-wrap justify-center gap-4 mt-4">
						{person.links.map((l) => (
							<a key={l.url} href={l.url} className="clay-interactive px-6 py-3 font-bold uppercase tracking-widest text-[#FFB000]">
								{l.label}
							</a>
						))}
					</div>
				</div>
			</header>

			<section className="clay p-8 md:p-10 flex flex-col gap-6 relative overflow-hidden">
				<h2 className="relative z-10">{label("section.about", 0)}</h2>
				<p className="leading-relaxed opacity-90 relative z-10">{linkify(person.summary, "underline decoration-amber-500/50 hover:decoration-amber-500")}</p>
				<div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FFB000] opacity-5 rounded-full blur-2xl"></div>
			</section>

			<section className="flex flex-col gap-10">
				<h2 className="px-2">{label("section.projects", 0)}</h2>
				<div className="flex flex-col gap-16">
					{projects.map((p) => (
						<article key={p.id} className="clay flex flex-col overflow-hidden">
							<div className="p-8 md:p-10 flex flex-col gap-8">
								<header>
									<h3 className="mb-2">
										<a href={p.url} className="hover:underline">{p.name}</a>
									</h3>
									<p className="opacity-90 italic">{p.tagline}</p>
								</header>
								
								<div className="flex flex-col gap-4 opacity-90">
									{p.description.map((d, i) => (
										<p key={i}>{linkify(d, "underline decoration-amber-500/50 hover:decoration-amber-500")}</p>
									))}
								</div>
								
								{p.features && p.features.length > 0 && (
									<ul className="list-disc pl-5 opacity-80 space-y-2">
										{p.features.map(f => <li key={f}>{f}</li>)}
									</ul>
								)}
								
								{p.stats && p.stats.length > 0 && (
									<div className="flex flex-wrap gap-4 mt-2">
										{p.stats.map(s => (
											<div key={s.label} className="clay px-5 py-3 flex flex-col">
												<span className="font-bold">{s.value}</span>
												<span className="opacity-90">{s.label}</span>
											</div>
										))}
									</div>
								)}
								
								<div className="flex flex-wrap gap-4 mt-4">
									{Object.values(p.stores ?? {}).map((s) => (
										<a key={s.url} href={s.url} className="clay-interactive p-3">
											<img src={s.badge} alt={s.alt} className="h-10 w-auto" />
										</a>
									))}
								</div>
							</div>
							
							{p.media && p.media.kind === "phone-video" && (
								<div className="bg-black/30 p-8 md:p-12 flex justify-center border-t border-amber-500/10">
									<div className="clay p-2 rounded-[2rem] w-64 shadow-2xl relative">
										<div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/40 rounded-full z-10"></div>
										<video 
											src={p.media.video} 
											poster={p.media.poster} 
											className="w-full rounded-[1.5rem] mix-blend-screen opacity-90 grayscale-[0.5] contrast-125 sepia-[0.2]" 
											style={{aspectRatio: p.media.aspectRatio}}
											muted autoPlay loop playsInline
										/>
									</div>
								</div>
							)}
						</article>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-10">
				<h2 className="px-2">{label("section.experience", 0)}</h2>
				<div className="flex flex-col gap-10">
					{experience.map((e) => (
						<article key={e.company} className="clay p-8 md:p-10 flex flex-col gap-8 relative overflow-hidden">
							<div className="absolute top-0 left-0 w-1 h-full bg-[#FFB000] shadow-[0_0_15px_#FFB000]"></div>
							<header>
								<h3 className="mb-2">
									{e.url ? (
										<a href={e.url} className="hover:underline">{e.company}</a>
									) : (
										e.company
									)}
								</h3>
								<p className="opacity-90 font-bold">{e.role} &mdash; {e.period}</p>
							</header>
							
							<ul className="flex flex-col gap-4 opacity-90 list-disc pl-5">
								{e.highlights.map((h, i) => (
									<li key={i}>{linkify(h, "underline decoration-amber-500/50 hover:decoration-amber-500")}</li>
								))}
							</ul>
							
							{e.stats && e.stats.length > 0 && (
								<div className="flex flex-wrap gap-4 mt-2">
									{e.stats.map(s => (
										<div key={s.label} className="clay px-5 py-3 flex flex-col">
											<span className="font-bold">{s.value}</span>
											<span className="opacity-90">{s.label}</span>
										</div>
									))}
								</div>
							)}
						</article>
					))}
				</div>
			</section>
			
			{writing && writing.length > 0 && (
				<section className="flex flex-col gap-10">
					{writing.map(w => (
						<div key={w.id} className="clay p-8 md:p-10 flex flex-col gap-6">
							<h2>{w.heading}</h2>
							<div className="flex flex-col gap-4 opacity-90">
								{w.paragraphs.map((p, i) => (
									<p key={i}>{linkify(p, "underline decoration-amber-500/50 hover:decoration-amber-500")}</p>
								))}
							</div>
						</div>
					))}
				</section>
			)}
			
			<section className="flex flex-col gap-10">
				<h2 className="px-2">{label("section.testimonials", 0)}</h2>
				<div className="flex flex-col gap-6">
					{testimonials.map((t, i) => (
						<div key={i} className="clay p-8 flex flex-col gap-6">
							<p className="italic opacity-90 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
							<p className="text-right opacity-90 uppercase tracking-widest font-bold">&mdash; {t.attribution}</p>
						</div>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-10">
				<h2 className="px-2">{label("section.skills", 0)}</h2>
				<div className="flex flex-wrap gap-4 px-2">
					{skills.technical.map((s) => (
						<div key={s.name} className="clay px-5 py-3 flex items-center gap-3">
							{s.logo && <img src={s.logo} alt="" className="w-5 h-5 object-contain opacity-80 mix-blend-screen grayscale" aria-hidden="true" />}
							<span className="font-bold tracking-wider">{s.name}</span>
						</div>
					))}
				</div>
			</section>

			<section className="clay p-8 md:p-10 flex flex-col gap-8 mt-16 border border-[#FFB000]/10">
				<header>
					<h2 className="mb-2">{colophon.heading}</h2>
					<p className="font-bold uppercase tracking-widest opacity-80 text-[#FFB000]">{colophon.tagline}</p>
				</header>
				
				<div className="flex flex-col gap-4 opacity-90">
					{colophon.paragraphs.map((p, i) => (
						<p key={i}>{linkify(p, "underline decoration-amber-500/50 hover:decoration-amber-500")}</p>
					))}
				</div>
				
				<div className="flex flex-col gap-6 mt-4 border-l-2 border-[#FFB000]/30 pl-6 py-2">
					{colophon.steps.map((s, i) => (
						<div key={i}>
							<h4 className="inline mr-3 text-[#FFB000]">{s.label}:</h4>
							<span className="opacity-90">{linkify(s.text, "underline")}</span>
						</div>
					))}
				</div>
				
				<div className="flex flex-wrap gap-8 mt-8 justify-between border-t border-[#FFB000]/10 pt-8">
					<div className="flex flex-wrap gap-8">
						{colophon.facts.map(f => (
							<div key={f.label} className="flex flex-col">
								<span className="font-bold text-[#FFB000]">{f.value}</span>
								<span className="opacity-90">{f.label}</span>
							</div>
						))}
					</div>
					
					<div className="flex gap-4 flex-wrap w-full md:w-auto">
						{colophon.links.map(l => (
							<a key={l.url} href={l.url} className="clay-interactive px-6 py-3 font-bold flex items-center justify-center gap-3 text-[#FFB000] w-full md:w-auto">
								{l.label} <MoveRight size={20} />
							</a>
						))}
					</div>
				</div>
			</section>

			<footer className="flex flex-col items-center gap-10 opacity-90 mt-16 mb-24 px-4">
				<nav className="flex flex-wrap justify-center gap-8 font-bold uppercase tracking-widest">
					{person.links.map((l) => (
						<a key={l.url} href={l.url} className="hover:text-[#FFB000] transition-colors">{l.label}</a>
					))}
					<a href="/history" className="hover:text-[#FFB000] transition-colors">{label("nav.history")}</a>
				</nav>
				<p>{label("misc.copyright", 0)}</p>
			</footer>
		</main>
	);
}
