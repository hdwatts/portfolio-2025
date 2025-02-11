// Inspired by -> https://github.com/chrismwilliams/astro-theme-cactus/blob/main/src/components/Search.astro

import "@pagefind/default-ui/css/ui.css";
import { SearchIcon } from "lucide-react";
import { Button } from "./Button";
import { useEffect, useRef } from "react";

export const Search = () => {
	const rootRef = useRef<HTMLDivElement | null>(null);
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
			if (e.key === "/" && !dialog.open) {
				openModal();
				e.preventDefault();
			}
		};
		window.addEventListener("keydown", listenForSlash);

		if (!import.meta.env.DEV) {
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
		}

		return () => {
			window.removeEventListener("keydown", listenForSlash);
		};
	}, []);
	return (
		<div id="search" ref={rootRef} className="ms-auto">
			<button
				data-open-modal
				disabled
				className="flex items-center justify-center gap-1 rounded-md"
			>
				<SearchIcon />
				<span className="text-2xl md:hidden">Search</span>
			</button>
			<dialog
				onClick={(e) => e.stopPropagation()}
				aria-label="search"
				className="bg-background text-primary border-secondary h-full max-h-full w-full max-w-full border opacity-0 shadow transition-opacity backdrop:backdrop-blur sm:mx-auto sm:mt-16 sm:mb-auto sm:h-max sm:max-h-[calc(100%-8rem)] sm:min-h-[15rem] sm:w-5/6 sm:max-w-[48rem] sm:rounded-md"
			>
				<div className="dialog-frame flex flex-col gap-4 p-6 pt-12 sm:pt-6">
					<div className="flex items-center justify-between">
						<div className="font-sans text-lg font-semibold">
							Search
						</div>
						<Button
							className="ms-auto cursor-pointer"
							variant="secondary"
							data-close-modal
						>
							Close
						</Button>
					</div>
					{false && import.meta.env.DEV ? (
						<div className="mx-auto text-center">
							<p>
								Search is only available in production builds.{" "}
								<br />
								Try building and previewing the site to test it
								out locally.
							</p>
						</div>
					) : (
						<div className="search-container">
							<div id="pagefind__search" />
						</div>
					)}
				</div>
			</dialog>
		</div>
	);
};
