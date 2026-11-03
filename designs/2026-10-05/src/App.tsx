import { motion } from "motion/react";
import { data, label } from "./data";
import { ArrowUpRight, MapPin, Plus, MoveRight } from "lucide-react";

export function App() {
	const { person, projects, experience, skills, testimonials, writing } = data;

	return (
		<div className="min-h-screen bg-midnight text-text font-sans relative overflow-x-hidden selection:bg-acid selection:text-midnight">
			{/* Topographic and Grid Backgrounds */}
			<div className="fixed inset-0 pointer-events-none topography-bg z-0 opacity-40" />
			<div className="fixed inset-0 pointer-events-none grid-bg z-0 opacity-60" />

			<div className="relative z-10 max-w-[2560px] mx-auto p-6 md:p-12 lg:p-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
				
				{/* Sidebar / Header */}
				<header className="lg:col-span-3 flex flex-col gap-16 lg:sticky lg:top-24 h-max border-t border-acid pt-8">
					<div className="flex flex-col gap-8">
						<div className="flex items-center justify-between border-b border-midnight-light pb-4">
							<div className="flex items-center gap-4 text-acid">
								<Plus size={16} />
								<span className="tracking-widest text-xs uppercase font-bold">01</span>
							</div>
						</div>
						
						<div className="flex flex-col gap-2 group cursor-default">
							<h1 className="text-5xl md:text-6xl lg:text-7xl font-bold uppercase leading-[0.85] tracking-tighter group-hover:text-acid transition-colors duration-500 break-words">
								{person.name}
							</h1>
							<h2 className="text-xl md:text-2xl font-light text-text-dim mt-4">
								{person.title}
							</h2>
						</div>

						<div className="flex items-center gap-3 text-acid-dark font-mono text-sm border border-midnight-light w-fit px-4 py-2 group hover:border-acid transition-colors">
							<MapPin size={16} className="group-hover:text-acid transition-colors" /> 
							<span className="uppercase group-hover:text-acid transition-colors">{person.location}</span>
						</div>
					</div>

					<nav className="flex flex-col border-t border-midnight-light">
						{person.links.map(l => (
							<a 
								key={l.url} 
								href={l.url}
								className="group flex items-center justify-between border-b border-midnight-light py-4 text-text-dim hover:text-acid hover:pl-4 transition-all duration-300"
							>
								<span className="uppercase tracking-widest text-sm font-semibold">{l.label}</span>
								<ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
							</a>
						))}
						<a 
							href="/history"
							className="group flex items-center justify-between border-b border-midnight-light py-4 text-text-dim hover:text-acid hover:pl-4 transition-all duration-300"
						>
							<span className="uppercase tracking-widest text-sm font-semibold">{label("nav.history")}</span>
							<ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
						</a>
					</nav>
				</header>

				{/* Main Content */}
				<main className="lg:col-span-9 flex flex-col gap-32 lg:gap-48 pb-32">
					
					{/* Section: About */}
					<section className="flex flex-col gap-10 relative">
						<div className="flex items-center gap-4 text-acid mb-4">
							<span className="tracking-widest text-xs uppercase font-bold">02</span>
							<div className="h-[1px] w-12 bg-acid" />
							<h3 className="text-sm uppercase tracking-widest">{label("section.about")}</h3>
						</div>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-12 xl:gap-24 items-start">
							<div className="flex flex-col gap-8 text-xl md:text-2xl font-light leading-relaxed group">
								<div className="flex flex-col gap-4 text-text border-l border-midnight-light pl-6 group-hover:border-acid transition-colors duration-500">
									{person.headline.map((h, i) => <p key={i}>{h}</p>)}
								</div>
								<p className="text-text-dim text-lg">{person.summary}</p>
							</div>
							<div className="relative group">
								<div className="absolute inset-0 bg-acid/20 translate-x-4 translate-y-4 group-hover:translate-x-8 group-hover:translate-y-8 transition-transform duration-500 z-0 border border-acid" />
								<img 
									src={person.headshot.src} 
									alt={person.headshot.alt} 
									className="relative z-10 w-full aspect-square object-cover grayscale group-hover:grayscale-0 transition-all duration-700 border border-midnight-lighter bg-midnight" 
								/>
							</div>
						</div>
					</section>

					{/* Interstitial Testimonial 1 */}
					<div className="w-full flex justify-center items-center py-12 md:py-24 group relative">
						<div className="absolute left-0 top-1/2 -translate-y-1/2 w-32 h-[1px] bg-acid-dark/30 group-hover:w-1/4 transition-all duration-700 hidden md:block" />
						<div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-[1px] bg-acid-dark/30 group-hover:w-1/4 transition-all duration-700 hidden md:block" />
						<blockquote className="flex flex-col gap-6 text-center max-w-4xl px-4 relative z-10">
							<span className="text-acid text-9xl font-sans leading-none h-12 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">"</span>
							<p className="text-3xl md:text-5xl lg:text-7xl font-bold uppercase tracking-tighter leading-[0.9] text-text-dim group-hover:text-acid transition-colors duration-700">
								{testimonials[0].quote}
							</p>
							<footer className="text-acid-dark uppercase tracking-widest text-sm font-mono mt-4">
								— {testimonials[0].attribution}
							</footer>
						</blockquote>
					</div>

					{/* Section: Experience */}
					<section className="flex flex-col gap-10 relative">
						<div className="flex items-center gap-4 text-acid mb-4">
							<span className="tracking-widest text-xs uppercase font-bold">03</span>
							<div className="h-[1px] w-12 bg-acid" />
							<h3 className="text-sm uppercase tracking-widest">{label("section.experience")}</h3>
						</div>

						<div className="flex flex-col border-t border-midnight-light">
							{experience.map((exp, index) => (
								<article key={index} className="group grid grid-cols-1 xl:grid-cols-12 gap-8 py-12 border-b border-midnight-light hover:bg-midnight-light/50 transition-colors px-4 -mx-4">
									<div className="xl:col-span-4 flex flex-col gap-3">
										<div className="flex items-center gap-3 text-acid-dark font-mono text-sm">
											<MoveRight size={16} className="group-hover:text-acid transition-colors group-hover:translate-x-2 duration-300" />
											<span className="group-hover:text-acid transition-colors">{exp.period}</span>
										</div>
										<h4 className="text-3xl font-bold uppercase tracking-tight group-hover:text-acid transition-colors">
											{exp.url ? (
												<a href={exp.url} className="hover:underline">{exp.company}</a>
											) : exp.company}
										</h4>
										<span className="text-text-dim uppercase tracking-widest text-sm">{exp.role}</span>
									</div>
									<div className="xl:col-span-8 flex flex-col gap-8">
										<ul className="flex flex-col gap-4 text-text-dim">
											{exp.highlights.map((h, i) => (
												<li key={i} className="flex gap-4">
													<span className="text-acid mt-1.5">•</span>
													<span className="leading-relaxed group-hover:text-text transition-colors">{h}</span>
												</li>
											))}
										</ul>
										{exp.stats.length > 0 && (
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-midnight-lighter">
												{exp.stats.map((s, i) => (
													<div key={i} className="flex flex-col gap-1 group/stat hover:-translate-y-1 transition-transform">
														<span className="text-2xl lg:text-3xl font-bold text-text group-hover/stat:text-acid transition-colors">{s.value}</span>
														<span className="text-xs text-text-dim uppercase tracking-widest leading-snug">{s.label}</span>
													</div>
												))}
											</div>
										)}
									</div>
								</article>
							))}
						</div>
					</section>

					{/* Interstitial Testimonial 2 */}
					<div className="w-full flex justify-end items-center py-12 group">
						<blockquote className="flex flex-col gap-6 text-right max-w-3xl border-r-4 border-acid pr-8">
							<p className="text-2xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tighter leading-tight text-text-dim group-hover:text-text transition-colors duration-500">
								"{testimonials[1].quote}"
							</p>
							<footer className="text-acid uppercase tracking-widest text-sm font-mono">
								— {testimonials[1].attribution}
							</footer>
						</blockquote>
					</div>

					{/* Section: Projects */}
					<section className="flex flex-col gap-16 relative">
						<div className="flex items-center gap-4 text-acid mb-4">
							<span className="tracking-widest text-xs uppercase font-bold">04</span>
							<div className="h-[1px] w-12 bg-acid" />
							<h3 className="text-sm uppercase tracking-widest">{label("section.projects")}</h3>
						</div>

						<div className="flex flex-col gap-32">
							{projects.map((p, i) => (
								<article key={p.id} className="grid grid-cols-1 xl:grid-cols-12 gap-12 group">
									<div className={`xl:col-span-7 flex flex-col gap-8 ${i % 2 !== 0 ? 'xl:order-last' : ''}`}>
										<div className="flex flex-col gap-4">
											<div className="flex items-center gap-4 text-acid-dark font-mono text-sm mb-2">
												<span>{p.year}</span>
												<div className="h-[1px] flex-1 bg-midnight-light group-hover:bg-acid/30 transition-colors" />
											</div>
											<a href={p.url} className="text-5xl md:text-7xl font-bold uppercase tracking-tighter group-hover:text-acid transition-colors w-fit leading-none">
												{p.name}
											</a>
											<span className="text-2xl text-text font-light tracking-wide">{p.tagline}</span>
										</div>
										<div className="flex flex-col gap-4 text-text-dim leading-relaxed border-l border-midnight-light pl-6 group-hover:border-acid transition-colors">
											{p.description.map((d, j) => <p key={j}>{d}</p>)}
										</div>
										
										{(p.features.length > 0 || p.tech.length > 0) && (
											<div className="flex flex-wrap gap-2 mt-4">
												{p.features.concat(p.tech).map(f => (
													<span key={f} className="text-xs uppercase tracking-widest border border-midnight-light bg-midnight-light/30 px-4 py-2 group-hover:border-acid/40 group-hover:text-acid transition-colors">
														{f}
													</span>
												))}
											</div>
										)}
										
										{p.stats.length > 0 && (
											<div className="grid grid-cols-2 gap-6 mt-4">
												{p.stats.map((s, idx) => (
													<div key={idx} className="flex flex-col gap-1">
														<span className="text-3xl font-bold text-text group-hover:text-acid transition-colors">{s.value}</span>
														<span className="text-xs text-text-dim uppercase tracking-widest">{s.label}</span>
													</div>
												))}
											</div>
										)}

										{p.stores && (
											<div className="flex flex-wrap gap-4 mt-6">
												{Object.values(p.stores).map(s => (
													<a key={s.url} href={s.url} className="hover:-translate-y-1 transition-transform bg-midnight-lighter p-1 border border-midnight-light hover:border-acid">
														<img src={s.badge} alt={s.alt} className="h-12 w-auto" />
													</a>
												))}
											</div>
										)}
									</div>
									<div className="xl:col-span-5 relative group-hover:-translate-y-2 transition-transform duration-700">
										<div className="absolute inset-0 bg-acid/20 translate-x-4 translate-y-4 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-700 z-0 border border-acid" />
										<a href={p.url} className="block relative z-10 border-2 border-midnight-lighter bg-midnight overflow-hidden aspect-[83/180] mx-auto max-w-[320px] group-hover:border-acid transition-colors duration-700">
											{p.media.kind === "phone-video" ? (
												<video src={p.media.video} poster={p.media.poster} aria-label={p.media.alt} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" style={{ aspectRatio: p.media.aspectRatio }} />
											) : (
												<img src={p.media.poster || ""} alt={p.media.alt} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" style={{ aspectRatio: p.media.aspectRatio }} />
											)}
										</a>
									</div>
								</article>
							))}
						</div>
					</section>

					{/* Section: Writing & Testimonials Grid */}
					<section className="flex flex-col gap-12 relative pt-24 border-t border-midnight-light">
						<div className="flex items-center gap-4 text-acid mb-4">
							<span className="tracking-widest text-xs uppercase font-bold">05</span>
							<div className="h-[1px] w-12 bg-acid" />
							<h3 className="text-sm uppercase tracking-widest">{writing[0].heading}</h3>
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
							<div className="xl:col-span-5 flex flex-col gap-8 text-xl font-light text-text-dim leading-relaxed group">
								{writing[0].paragraphs.map((p, i) => (
									<p key={i} className="group-hover:text-text transition-colors duration-500">{p}</p>
								))}
							</div>
							
							<div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
								{testimonials.slice(2).map((t, i) => (
									<div key={i} className="flex flex-col justify-between gap-6 p-8 border border-midnight-light hover:border-acid bg-midnight-light/20 hover:bg-acid/5 transition-all duration-300 group hover:-translate-y-1">
										<p className="text-lg font-medium text-text group-hover:text-acid transition-colors">"{t.quote}"</p>
										<span className="text-xs text-acid-dark uppercase tracking-widest font-mono border-t border-midnight-light pt-4 group-hover:border-acid/30">— {t.attribution}</span>
									</div>
								))}
							</div>
						</div>
					</section>

					{/* Footer Details */}
					<footer className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-12 border-t border-acid/50 text-acid-dark font-mono text-xs uppercase tracking-widest">
						<span>{label("misc.copyright")}</span>
						<div className="flex gap-4">
							{skills.technical.slice(0, 3).map(s => <span key={s.name}>{s.name}</span>)}
							<span>+</span>
						</div>
					</footer>
				</main>
			</div>
		</div>
	);
}
