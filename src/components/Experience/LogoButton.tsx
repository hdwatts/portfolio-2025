import { cn } from "../../lib/utils";
import { LOGOS_ROW_HEIGHT } from "./constants";

export type LogoButtonProps = {
	label: string;
	src: string;
	backgroundColor: string;
	url: string;
};

export const LogoButton = ({
	label,
	src,
	backgroundColor,
	url,
}: LogoButtonProps) => (
	<div
		onClick={() => window.open(url, "_blank")}
		className={cn(
			"group padding-0 relative cursor-pointer border-0 bg-transparent outline-offset-4 hover:brightness-110",
			"focus:not-[:focus-visible]!outline-none",
			"transition-[filter]",
		)}
		style={{
			height: LOGOS_ROW_HEIGHT,
			width: LOGOS_ROW_HEIGHT,
		}}
	>
		<span
			className={cn(
				"absolute top-0 left-0 translate-y-1 rounded-xl will-change-transform",
				"h-full w-full bg-black opacity-25",
				"transition-transform ease-in-out",
				"group-hover:translate-y-2",
				"group-active:translate-y-0.5",
			)}
		/>
		<span
			className={cn(
				"absolute top-0 left-0 h-full w-full rounded-xl brightness-50",
			)}
			style={{ backgroundColor }}
		/>
		<span
			className={cn(
				"relative flex flex-col items-center justify-center p-8",
				"h-full w-full -translate-y-2 rounded-xl will-change-transform",
				"transition-transform ease-in-out",
				"group-hover:-translate-y-4",
				"group-active:-translate-y-0.5 group-active:duration-75",
			)}
			style={{ backgroundColor }}
		>
			<div className="flex grow justify-center">
				<img src={src} width={100} height={100} alt={`${label} logo`} />
			</div>
			<span className="shrink text-3xl font-semibold">{label}</span>
		</span>
	</div>
);
