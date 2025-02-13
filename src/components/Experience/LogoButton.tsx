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
		className={cn(
			"group/button padding-0 relative cursor-pointer border-0 bg-transparent outline-offset-4 hover:brightness-110",
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
				"group-hover/button:translate-y-2",
				"group-active/button:translate-y-0.5",
			)}
		/>
		<span
			className={cn(
				"absolute top-0 left-0 h-full w-full rounded-xl brightness-50",
			)}
			style={{ backgroundColor }}
		/>
		<a
			href={url}
			target="_blank"
			className={cn(
				"flex flex-col items-center justify-center p-8 select-none",
				"h-full w-full -translate-y-2 rounded-xl will-change-transform",
				"transition-transform ease-in-out",
				"group-hover/button:-translate-y-4",
				"group-active/button:-translate-y-0.5 group-active/button:duration-75",
			)}
			style={{ backgroundColor }}
		>
			<div className="pointer-events-none flex grow justify-center">
				<img src={src} width={100} height={100} alt={`${label} logo`} />
			</div>
			<span
				className="text-primary shrink text-3xl"
				style={{ color: "hsl(0 0% 98%)" }}
			>
				{label}
			</span>
		</a>
	</div>
);
