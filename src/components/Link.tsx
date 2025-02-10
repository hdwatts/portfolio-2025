import type { PropsWithChildren } from "react";
import { cn } from "../lib/utils";

type LinkProps = {
	href: string;
	className?: string;
	target?: string;
};
export const Link = ({
	className,
	href,
	target = "_blank",
	children,
}: PropsWithChildren<LinkProps>) => (
	<a
		className={cn(
			"underline opacity-80 transition-opacity hover:opacity-100",
			className,
		)}
		target={target}
		href={href}
	>
		{children}
	</a>
);
