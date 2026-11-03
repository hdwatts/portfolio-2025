// Shape of data/portfolio.json. Copied into every design as src/portfolio.d.ts.
// Keep this in sync when adding fields to the data.

export interface Link {
	kind: "linkedin" | "github" | "resume" | "email" | "website" | string;
	label: string;
	url: string;
}

export interface Image {
	src: string;
	alt: string;
	width?: number;
	height?: number;
}

export interface Stat {
	/** A figure exactly as written in the source text, e.g. "$29 trillion". */
	value: string;
	/** Words that follow the figure in the source text. */
	label: string;
}

export interface Experience {
	company: string;
	companyShort: string;
	url: string | null;
	role: string;
	start: string;
	end: string | null;
	/** Display-ready date range. Use this rather than formatting start/end yourself. */
	period: string;
	highlights: string[];
	stats: Stat[];
}

export interface StoreLink {
	url: string;
	badge: string;
	alt: string;
}

export interface Project {
	id: string;
	name: string;
	url: string;
	tagline: string;
	year: string;
	description: string[];
	features: string[];
	tech: string[];
	stats: Stat[];
	media: {
		kind: "phone-video" | "image";
		video?: string;
		poster?: string;
		/** CSS aspect-ratio value, e.g. "83/180". */
		aspectRatio?: string;
		alt: string;
	};
	stores?: { appStore?: StoreLink; googlePlay?: StoreLink };
}

export interface Skill {
	name: string;
	logo?: string;
	brandColor?: string;
	url?: string;
}

export interface Testimonial {
	quote: string;
	attribution: string;
}

export interface Writing {
	id: string;
	heading: string;
	paragraphs: string[];
}

/** How the site itself is made (the weekly redesign). Rendered by every design. */
export interface Colophon {
	heading: string;
	/** One-line hook. Every design must display this. */
	tagline: string;
	paragraphs: string[];
	/** The pipeline as short labelled steps, in order. */
	steps: { label: string; text: string }[];
	/** Big-number facts, e.g. { value: "$10", label: "budget per design" }. */
	facts: Stat[];
	/** Includes the /history archive and the public source repo. */
	links: { label: string; url: string }[];
}

export type LabelKey =
	| "nav.home"
	| "nav.history"
	| "section.about"
	| "section.experience"
	| "section.projects"
	| "section.skills"
	| "section.softSkills"
	| "section.testimonials"
	| "section.contact"
	| "section.colophon"
	| "action.visit"
	| "action.play"
	| "action.resume"
	| "action.next"
	| "action.previous"
	| "action.replayIntro"
	| "action.skipIntro"
	| "action.toggleTheme"
	| "action.pauseAnimation"
	| "misc.present"
	| "misc.featured"
	| "misc.techStack"
	| "misc.copyright";

export interface Portfolio {
	person: {
		name: string;
		preferredName: string;
		handle: string;
		title: string;
		location: string;
		headline: string[];
		summary: string;
		headshot: Image;
		logo: Image;
		links: Link[];
	};
	writing: Writing[];
	experience: Experience[];
	projects: Project[];
	skills: { technical: Skill[]; soft: string[] };
	testimonials: Testimonial[];
	colophon: Colophon;
	labels: Record<LabelKey, string[]>;
	meta: { siteUrl: string; siteTitle: string; description: string; ogImage: string };
}
