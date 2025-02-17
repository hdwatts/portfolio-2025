import { navigate } from "astro:transitions/client";
import { useEffect, useState, type SetStateAction } from "react";
import {
	CommandDialog,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "./Command";
import { DialogTitle } from "./Dialog";
import { HomeIcon } from "lucide-react";

type SearchResultData = {
	meta: { image: string; title: string };
	excerpt: string;
	raw_url: string;
};

type SearchResult = {
	data: () => Promise<SearchResultData>;
};

type SearchResponse = {
	results: SearchResult[];
};

type Pagefind = {
	init: () => void;
	debouncedSearch: (value: string) => SearchResponse;
};

const initPagefind = async (): Promise<Pagefind> => {
	try {
		const module = import.meta.env.DEV
			? "../../dist/pagefind/pagefind.js"
			: "/pagefind/pagefind.js";
		const pagefind = (await import(/* @vite-ignore */ module)) as Pagefind;

		pagefind.init();

		return pagefind;
	} catch (e) {
		return {
			init: () => {},
			debouncedSearch: (v: string) => ({
				results: [],
			}),
		};
	}
};

export const Search = () => {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [searchTerm, setSearchTerm] = useState<string>();
	const [results, setResults] = useState<{
		photos?: SearchResultData[];
		posts?: SearchResultData[];
	}>({});
	const [pagefind, setPagefind] = useState<Pagefind>();

	const openSearchBar = async (open: SetStateAction<boolean>) => {
		setOpen(open);
		if (!pagefind && !isLoading) {
			setIsLoading(true);
			setPagefind(await initPagefind());
			setIsLoading(false);
		}
	};
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				openSearchBar((open) => !open);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const onChange = async (value: string) => {
		setSearchTerm(value);
		if (pagefind) {
			setIsSearching(true);
			const search = await pagefind.debouncedSearch(value);
			if (search) {
				const data = [];
				for (let a = 0; a < Math.min(search.results.length, 5); a++) {
					data.push(await search.results[a].data());
				}
				setIsSearching(false);
				setResults({
					photos: data.filter((d) =>
						d.raw_url.includes("/photography/"),
					),
					posts: data.filter((d) => d.raw_url.includes("/blog/")),
				});
			}
		}
	};

	return (
		<div id="pagefind__search" className="ms-auto">
			<div className="w-full flex-1 md:w-auto md:flex-none">
				<button
					onClick={() => openSearchBar(true)}
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
			<CommandDialog open={open} onOpenChange={openSearchBar}>
				<DialogTitle className="hidden items-center"></DialogTitle>
				{!isLoading ? (
					<CommandInput
						placeholder="Type to search..."
						value={searchTerm}
						onValueChange={onChange}
						isLoading={isSearching}
						autoFocus
					/>
				) : (
					<div className="flex justify-center py-4 text-sm">
						Loading search...
					</div>
				)}
				<CommandList>
					<CommandGroup>
						<CommandItem onSelect={() => navigate("/")}>
							<HomeIcon />
							Go Home
						</CommandItem>
					</CommandGroup>

					<CommandSeparator alwaysRender />
					{!results.photos?.length &&
					!results.posts?.length &&
					searchTerm ? (
						<div className="flex justify-center py-4 text-sm">
							No results found
						</div>
					) : null}
					<SearchResult
						results={results.posts}
						title="Blog Results"
					/>
					<SearchResult
						results={results.photos}
						title="Photography Results"
					/>
				</CommandList>
				{import.meta.env.DEV ? <CommandSeparator alwaysRender /> : null}
				{import.meta.env.DEV ? (
					<div className="mx-auto my-4 text-center text-xs">
						<p>
							Search is only available in production builds.{" "}
							<br />
							If you get out of date or no results try running{" "}
							<code className="text-xs!">npm run build</code>.
							<br />
							(This warning only appears in development)
						</p>
					</div>
				) : null}
			</CommandDialog>
		</div>
	);
};

const SearchResult = ({
	results,
	title,
}: {
	title: string;
	results?: SearchResultData[];
}) =>
	results?.length ? (
		<CommandGroup heading={title}>
			{results?.map((result) => (
				<CommandItem
					key={result.raw_url}
					onSelect={() => navigate(result.raw_url)}
					className="flex flex-nowrap items-center justify-center gap-2"
				>
					<div className="outline-secondary max-h-[100px] min-w-[150px] overflow-hidden rounded-2xl outline">
						{import.meta.env.DEV ? (
							<div className="outline-secondary bg-secondary flex h-32 items-center justify-center rounded-2xl p-3 text-xs outline">
								Thumbnails unavailable in development
							</div>
						) : (
							<img src={result.meta.image} width={150} />
						)}
					</div>
					<div className="border-primary flex shrink flex-col gap-4 border-l-2 pl-4">
						<div className="w-full overflow-hidden text-sm font-bold sm:text-base">
							{result.meta.title}
						</div>
						<div
							className="text-xs sm:text-sm"
							dangerouslySetInnerHTML={{
								__html: result.excerpt,
							}}
						/>
					</div>
				</CommandItem>
			))}
		</CommandGroup>
	) : null;
