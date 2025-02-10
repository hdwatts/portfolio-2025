import type { PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

export const TypographyH1: React.FC<
	PropsWithChildren<{ className?: string }>
> = ({ children, className }) => {
	return (
		<h1
			className={cn(
				"scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
				className,
			)}
		>
			{children}
		</h1>
	);
};

export const TypographyH2: React.FC<PropsWithChildren> = ({ children }) => {
	return (
		<h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
			{children}
		</h2>
	);
};

export const TypographyH3: React.FC<PropsWithChildren> = ({ children }) => {
	return (
		<h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
			{children}
		</h3>
	);
};

export const TypographyH4: React.FC<PropsWithChildren> = ({ children }) => {
	return (
		<h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
			{children}
		</h4>
	);
};

export const TypographyP: React.FC<PropsWithChildren> = ({ children }) => {
	return <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>;
};

export const TypographyBlockquote: React.FC<PropsWithChildren> = ({
	children,
}) => {
	return (
		<blockquote className="mt-6 border-l-2 pl-6 italic">
			{children}
		</blockquote>
	);
};
