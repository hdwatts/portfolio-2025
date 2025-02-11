// Inspired by -> https://github.com/chrismwilliams/astro-theme-cactus/blob/main/src/components/Search.astro

import "@pagefind/default-ui/css/ui.css";
import { Button } from "./Button";
import { useEffect, useRef, useState } from "react";
import { Cross, X } from "lucide-react";

export const Search = () => {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const [didRun, setDidRun] = useState(false);
	useEffect(() => {
		const openBtn = rootRef.current?.querySelector<HTMLButtonElement>(
			"button[data-open-modal]",
		)!;
		const closeBtn = rootRef.current?.querySelector<HTMLButtonElement>(
			"button[data-close-modal]",
		)!;
		const dialog = rootRef.current?.querySelector("dialog")!;
		const dialogFrame = rootRef.current?.querySelector(".dialog-frame")!;

		const onWindowClick = (event: MouseEvent) => {
			// make sure the click is outside the of the dialog
			if (
				document.body.contains(event.target as Node) &&
				!dialogFrame.contains(event.target as Node)
			)
				closeModal();
		};
		const handleEscKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && dialog.open) {
				closeModal();
				window.removeEventListener("keydown", handleEscKey);
			} else return;
		};
		const openModal = (event?: MouseEvent) => {
			dialog.showModal();
			dialog.classList.toggle("opacity-0");
			document.body.classList.add("overflow-hidden");
			rootRef.current?.querySelector("input")?.focus();
			event?.stopPropagation();
			window.addEventListener("click", onWindowClick);
			window.addEventListener("keydown", handleEscKey);
		};

		const closeModal = () => {
			dialog.close();
			dialog.open = false;
			dialog.classList.add("opacity-0");
			document.body.classList.remove("overflow-hidden");
			window.removeEventListener("click", onWindowClick);
			window.addEventListener("keydown", handleEscKey);
		};

		openBtn.addEventListener("click", openModal);
		openBtn.disabled = false;
		closeBtn.addEventListener("click", closeModal);
		document.addEventListener("astro:after-swap", closeModal);

		// Listen for `/` keyboard shortcut
		const listenForSlash = (e: KeyboardEvent) => {
			if (
				e.key.toLowerCase() === "k" &&
				(e.metaKey || e.ctrlKey) &&
				!dialog.open
			) {
				openModal();
				e.preventDefault();
			}
		};
		window.addEventListener("keydown", listenForSlash);

		if (!didRun) {
			const onIdle =
				window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
			onIdle(async () => {
				// @ts-ignore
				const { PagefindUI } = await import("@pagefind/default-ui");
				new PagefindUI({
					element: "#pagefind__search",
					baseUrl: import.meta.env.BASE_URL,
					bundlePath:
						import.meta.env.BASE_URL.replace(/\/$/, "") +
						"/pagefind/",
					showImages: false,
				});
			});
			setDidRun(true);
		}

		return () => {
			window.removeEventListener("keydown", listenForSlash);
			openBtn.removeEventListener("click", openModal);
			closeBtn.removeEventListener("click", closeModal);
			document.removeEventListener("astro:after-swap", closeModal);
		};
	}, [didRun]);
	return (
		<div id="search" ref={rootRef} className="ms-auto">
			<div className="w-full flex-1 md:w-auto md:flex-none">
				<button
					data-open-modal
					disabled
					className="focus-visible:ring-ring border-input hover:bg-accent hover:text-accent-foreground bg-muted/50 text-muted-foreground relative inline-flex h-8 w-full items-center justify-start gap-2 rounded-[0.5rem] border px-4 py-2 text-sm font-normal whitespace-nowrap shadow-none transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:pr-12 md:w-40 lg:w-56 xl:w-64 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
				>
					<span className="hidden lg:inline-flex">
						Search blog posts...
					</span>
					<span className="inline-flex lg:hidden">Search...</span>
					<kbd className="bg-muted pointer-events-none absolute top-[0.3rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
						<span className="text-xs">⌘</span>K
					</kbd>
				</button>
			</div>
			<dialog
				onClick={(e) => e.stopPropagation()}
				aria-label="search"
				className="bg-background text-primary border-secondary h-full max-h-full w-full max-w-full border opacity-0 shadow transition-opacity backdrop:backdrop-blur sm:mx-auto sm:mt-16 sm:mb-auto sm:h-max sm:max-h-[calc(100%-8rem)] sm:min-h-[15rem] sm:w-5/6 sm:max-w-[48rem] sm:rounded-md"
			>
				<div className="dialog-frame flex flex-col gap-4 p-6 pt-12 sm:pt-6">
					<div className="flex items-center justify-between">
						<div className="font-sans text-lg font-semibold">
							Search Blog Posts
						</div>
						<Button
							className="focus-visible:ring-ring border-input hover:bg-accent hover:text-accent-foreground bg-muted/50 text-muted-foreground relative inline-flex h-8 w-fit cursor-pointer items-center justify-start gap-2 rounded-[0.5rem] border px-4 py-2 text-sm font-normal whitespace-nowrap shadow-none transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:pr-12 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
							variant="outline"
							data-close-modal
						>
							<span className="text-primary inline-flex text-xs">
								Close
							</span>
							<kbd className="bg-muted pointer-events-none absolute top-[0.3rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
								<span className="text-xs">Esc</span>
							</kbd>
						</Button>
					</div>
					{import.meta.env.DEV ? (
						<div className="mx-auto text-center text-xs">
							<p>
								Search is only available in production builds.{" "}
								<br />
								If you get out of date results try running{" "}
								<code className="text-xs!">npm run build</code>.
								<br />
								This warning only appears in development.
							</p>
						</div>
					) : null}
					<div className="search-container">
						<div id="pagefind__search" />
					</div>
				</div>
			</dialog>
		</div>
	);
};
