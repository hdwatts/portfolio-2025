import type { PropsWithChildren } from "react";
import { cn } from "../lib/utils";

type LinkProps = {
	href: string;
	className?: string;
};
export const Link = ({
	className,
	href,
	children,
}: PropsWithChildren<LinkProps>) => (
	<a
		className={cn(
			"underline opacity-80 transition-opacity hover:opacity-100",
			className,
		)}
		href={href}
	>
		{children}
	</a>
);
