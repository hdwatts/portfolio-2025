import { MapPin } from "lucide-react";
import { Link } from "./Link";
import { Badge } from "./Badge";

type WhoAmIProps = {
	headshot?: React.ReactElement;
};
export const WhoAmI = ({ headshot }: WhoAmIProps) => (
	<div className="flex max-w-2xl flex-col items-center rounded-2xl px-5 sm:flex-row sm:gap-16">
		<div className="mb-8 flex flex-col items-center justify-center gap-2">
			{headshot}
			<Badge
				className="flex w-48 justify-center gap-1 sm:w-fit"
				variant="secondary"
			>
				<MapPin className="w-4" />
				<span>New York, NY</span>
			</Badge>
		</div>
		<div className="flex h-32 flex-col gap-4 md:justify-between">
			<div className="flex flex-col">
				<div className="mb-2 flex w-full justify-between text-xl font-semibold">
					<span>Howard Dean Watts</span>
				</div>
				<span className="text-sm md:text-base">
					Founding Staff Software Engineer at{" "}
					<Link href="https://www.chronograph.pe">
						Chronograph.pe
					</Link>
				</span>
				<span className="text-sm md:text-base">
					Creator of{" "}
					<Link href="https://www.wordtree.app">WordTree.app</Link>
				</span>
			</div>
			<div className="flex gap-4 text-xs md:text-sm">
				<span className="font-semibold">Connect:</span>
				<Link href="https://www.linkedin.com/in/hdwatts/">
					Linkedin
				</Link>
				<Link href="https://www.github.com/hdwatts/">Github</Link>
			</div>
		</div>
	</div>
);
