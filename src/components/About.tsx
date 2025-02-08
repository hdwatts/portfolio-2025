import { Hand, LucideQuote, Quote } from "lucide-react";
import { Link } from "./Link";

export const About = () => (
	<div className="text-accent-foreground relative flex w-full max-w-2xl items-center gap-8">
		<div className="absolute -left-16">
			<Hand
				width={32}
				height={32}
				className="animate-wave origin-bottom"
			/>
		</div>
		<p className="border-l-4 px-8">
			Hey there. I am a software developer based in New York, currently at
			Chronograph Private Equity, where I lead the development of advanced
			tools for automating the extraction of unstructured data from our
			clients.
		</p>
		{/* <p>
			Outside my normal work, I am always tinkering with side projects. My
			current interests include exploring the universal app space with
			both <Link href="https://www.tauri.app/">Tauri</Link> (
			<Link href="https://www.rust-lang.org">Rust</Link>) and{" "}
			<Link href="https://expo.dev/">Expo</Link> (
			<Link href="https://reactnative.dev/">React Native</Link>). I am
			especially interested in the syncing layer between distributed apps,
			either through following{" "}
			<Link href="https://localfirstweb.dev/">Local First</Link> design
			patterns or
		</p> */}
	</div>
);
