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
	target,
	children,
}: PropsWithChildren<LinkProps>) => {
	const defaultTarget = href.startsWith("/") ? target : "_blank";
	return (
		<a
			className={cn(
				"underline opacity-80 transition-opacity hover:opacity-100",
				className,
			)}
			target={target ?? defaultTarget}
			href={href}
		>
			{children}
		</a>
	);
};
