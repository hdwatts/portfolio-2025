import { useEffect, useRef, useState } from "react";
import {
	useVirtualizer,
	type VirtualItem,
	Virtualizer,
} from "@tanstack/react-virtual";
import {
	useReactTable,
	getCoreRowModel,
	createColumnHelper,
	flexRender,
	type Row,
	type Table,
	type ColumnDef,
} from "@tanstack/react-table";
import { downloadCSVFromObjects } from "../../lib/exportCsv";
import omit from "lodash/omit";

type IsruRow = {
	rank: number;
	username: string;
	total_points: number;
};

type PaginationInfo = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
};

type LeaderboardResponse = {
	data: IsruRow[];
	pagination: PaginationInfo;
	search: string;
	last_updated_at: string;
};

const columnHelper = createColumnHelper<IsruRow>();

const totalActiveUsers = 45161;

const columns: ColumnDef<IsruRow>[] = [
	{
		id: "rank",
		header: "Rank",
		accessorKey: "rank",
	},
	{
		id: "isru_id",
		header: "Internal ID",
		accessorKey: "isru_id",
	},
	{
		id: "username",
		header: "Username",
		accessorKey: "username",
		cell: ({ row }) => {
			return (
				<a
					href={`https://isrucamp.com/leaderboard#${row.original.username}`}
					target="_blank"
					className="font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
				>
					{row.original.username}
				</a>
			);
		},
	},
	{
		id: "total_points",
		header: "Total Points",
		accessorKey: "total_points",
	},
	{
		id: "percentile",
		header: "Percentile",
		cell: ({ row }) => {
			return (
				<div>
					{(
						100 -
						((row.original.rank - 1) / (totalActiveUsers - 1)) * 100
					).toFixed(3)}
					%
				</div>
			);
		},
	},
];

export const IsruStats = () => {
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
	const [data, setData] = useState<IsruRow[] | null>(null);
	const [textInput, setTextInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(0);
	const [pagination, setPagination] = useState<PaginationInfo | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentView, setCurrentView] = useState<
		"leaderboard" | "leaderboard_with_missing"
	>("leaderboard");

	const fetchData = async (
		page: number = 0,
		search: string = "",
		view: string = currentView,
	) => {
		setLoading(true);
		try {
			const searchParams = new URLSearchParams({
				page: page.toString(),
				view: view,
				...(search && { search }),
			});
			const response = await fetch(`/api/leaderboard?${searchParams}`);
			const result: LeaderboardResponse = await response.json();
			setLastUpdatedAt(result.last_updated_at);
			setData(result.data);
			setPagination(result.pagination);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData(currentPage, searchTerm, currentView);
	}, [currentPage, searchTerm, currentView]);

	const table = useReactTable({
		data: data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		enableSorting: false,
	});

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="mb-8 text-center">
					<h1 className="mb-4 text-4xl font-bold text-gray-900">
						ISRU Estimated End of Camp Leaderboard
					</h1>
					<p className="text-sm text-gray-500 italic">
						Last updated: {lastUpdatedAt}
					</p>
				</div>
				<div className="mb-6 rounded-lg bg-white p-6 shadow-md">
					<h2 className="mb-4 text-2xl font-semibold text-gray-800">
						What is this?
					</h2>
					<p className="mb-4 leading-relaxed text-gray-700">
						The goal of this project is to provide an estimated
						snapshot of the leaderboard{" "}
						<span className="font-semibold">
							as of the end of camp
						</span>{" "}
						+ excellence after camp. It aims to accomplish this by:
					</p>
					<ol className="list-inside list-decimal space-y-3 leading-relaxed text-gray-700">
						<li className="pl-2">
							Scraping the current state of the leaderboard from
							the ISRU API.
						</li>
						<li className="pl-2">
							Filtering out all points that were earned in
							preseason, post season, and streak/rankup bonuses.
							The bonuses are filtered out because:
							<ul className="mt-2 ml-6 list-inside list-disc space-y-1">
								<li className="pl-2">
									Bonuses are calculated as of EST, so users
									in Asia and Europe got red badge upgrades
									for dates after camp.
								</li>
								<li className="pl-2">
									A small subset of users have a "double badge
									rank up to yellow" glitch for Ten Free
									throws, giving them an extra 14 points. This
									feels wrong to me.
								</li>
								<li className="pl-2">
									<span className="font-semibold">
										We do not know if ISRU will take the
										above into account!
									</span>
								</li>
							</ul>
						</li>
						<li className="pl-2">
							Keeping all negative adjustments that occur in the
							post season, as the moderating team is adjusting the
							points after the deadline.
						</li>
						<li className="pl-2">
							Dynamically calculating the streak bonuses for each
							user.
						</li>
						<li className="pl-2">
							Dynamically calculating the cumulative point bonuses
							for each user.
						</li>
						<li className="pl-2">
							Ten users have Wall Drawing points on the day before
							the wall drawing challenge was supposed to begin. I
							have filtered those out when it comes to streaks, as
							they end up with an extra 30 points that no other
							user can get.
						</li>
						<li className="pl-2">
							If a user used make up points and end up earning
							double cumulative point bonuses, those are currently
							not being counted. TBD on how I will handle those.
							See user: "dizzy" who had two Ten Free Throw bonuses
							and also used a make up day to fill in the gap.
						</li>
						<li className="pl-2">
							Turn any point reversals from deleted submissions to
							just -1 point, as streaks and bonuses are now
							dynamically calculated.
						</li>
						<li className="pl-2">
							Only count a single "Shared their Movie" submission
							as 101 points. The reason we include the bonus 100
							points no matter what is because it gets calculated
							in EST, so PST users who uploaded at like 10PM on
							the last day would end up with a 100 point bonus
							recorded after the deadline.{" "}
							<span className="font-semibold">
								This feels wrong to me, so I include those
								points, but we don't know how ISRU will handle
								it.
							</span>
						</li>
						<li className="pl-2">
							Doubled up points are not counted for cumulative
							point bonuses, even if they haven't been caught by
							mods. See users like "taichi" who have multiple
							points. They are currently still counted as normal
							points as it is too difficult to filter out.
						</li>
						<li className="pl-2">
							Tie breaking based on the internal ISRU ID of each
							user.
						</li>
						<li className="pl-2">
							Percentile is based on the current total number of
							active users:{" "}
							<span className="font-mono text-blue-600">
								{totalActiveUsers}
							</span>
							.
						</li>
					</ol>
				</div>
				<div className="mb-6 rounded-lg bg-white p-6 shadow-md">
					<h2 className="mb-4 text-2xl font-semibold text-gray-800">
						Additional Disclaimers - Please Read Before Asking
						Questions:
					</h2>
					<div className="mb-4 border-l-4 border-red-400 bg-red-50 p-4">
						<p className="font-semibold text-red-700">
							This is currently under very active development and
							should not be viewed as a 100% accurate snapshot of
							the leaderboard. I still haven't even scraped all
							the data yet, as of right now there are{" "}
							<span className="font-mono">
								{pagination ? pagination.total : "Loading..."}
							</span>{" "}
							users in the database.
						</p>
						<br />
						<p className="font-semibold text-red-700">
							I am not a member of ISRU staff. This leaderboard is
							purely an informed but heavily estimated opinion. If
							you choose to ignore these disclaimers and treat it
							as definitive, any frustration or disappointment
							over not receiving an invoice is entirely your own
							responsibility.
						</p>
					</div>
					<div className="mb-4 border-l-4 border-orange-400 bg-orange-50 p-4">
						<p className="font-semibold text-orange-700">
							Postseason excellence is working but it is a manual
							process. If you received excellence after the "Last
							Updated At" date above then it is not yet reflected
							in the leaderboard. I run the script pretty often,
							so it should be updated in due time!
						</p>
					</div>
					<p className="leading-relaxed text-gray-700">
						The request for user data could have failed at various
						points. If it failed during the gathering of the user's
						point history, it may lead to inaccurate data. If you
						believe this happened to you, please contact{" "}
						<span className="font-semibold">@MiNiMAL</span> on the
						bootleg discord aka{" "}
						<a
							href="https://isrucamp.com/leaderboard#hdwatts"
							target="_blank"
							className="text-blue-600 underline hover:text-blue-800"
						>
							@hdwatts on ISRU
						</a>
						.
					</p>
				</div>
				<div className="mb-6 rounded-lg bg-white p-4 shadow-md">
					<h3 className="mb-3 text-lg font-medium text-gray-800">
						Leaderboard Toggle
					</h3>
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => {
								setCurrentView("leaderboard");
								setCurrentPage(0);
							}}
							disabled={loading}
							className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed ${
								currentView === "leaderboard"
									? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100"
							}`}
						>
							Standard Leaderboard
						</button>
						<button
							onClick={() => {
								setCurrentView("leaderboard_with_missing");
								setCurrentPage(0);
							}}
							disabled={loading}
							className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed ${
								currentView === "leaderboard_with_missing"
									? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
									: "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100"
							}`}
						>
							Leaderboard With Makeup Days (BETA)
						</button>
					</div>
					<div className="mt-4 border-l-4 border-red-400 bg-red-50 p-4">
						<ul className="list-inside list-disc space-y-3 leading-relaxed text-gray-700">
							<li className="pl-2">
								<b>Standard Leaderboard</b> shows users without
								any of the makeup days applied from the
								2025-09-11 emails.
							</li>
							<li className="pl-2">
								<b>Leaderboard With Makeup Days</b> assumes that
								all users who were missing known makeup days
								(2025-07-17, 2025-07-18, 2025-07-24, 2025-09-02,
								2025-09-03) made those days up.{" "}
								<b className="font-semibold text-red-700">
									It should not be viewed as an accurate
									representation of reality, but as a view
									into what the "best case scenario" for all
									users who missed the above days could look
									like. It is also under EXTREMELY active
									development. There may be bugs.
								</b>
							</li>
						</ul>
					</div>
				</div>
				<div className="mb-6 rounded-lg bg-white p-6 shadow-md">
					<div className="flex flex-row items-center gap-3">
						<input
							type="text"
							disabled={loading}
							placeholder="Search for username..."
							className="min-w-0 flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
							value={textInput}
							onChange={(e) => {
								const value = e.target.value;
								setTextInput(value);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									setSearchTerm(textInput);
									setCurrentPage(0);
								}
							}}
						/>
						<button
							onClick={() => {
								setSearchTerm(textInput);
								setCurrentPage(0);
							}}
							disabled={loading}
							className="cursor-pointer rounded-md bg-blue-600 px-6 py-2 whitespace-nowrap text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400"
						>
							Search
						</button>

						{searchTerm && (
							<button
								onClick={() => {
									setSearchTerm("");
									setTextInput("");
									setCurrentPage(0);
								}}
								disabled={loading}
								className="cursor-pointer rounded-md bg-gray-500 px-4 py-2 whitespace-nowrap text-white transition-colors hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400"
							>
								Clear Search
							</button>
						)}
					</div>
				</div>

				{/* Pagination Info */}
				{pagination && (
					<div className="mb-6 rounded-lg bg-white p-4 shadow-md">
						<p className="text-sm text-gray-600">
							Showing{" "}
							<span className="font-semibold text-gray-900">
								{data?.length || 0}
							</span>{" "}
							of{" "}
							<span className="font-semibold text-gray-900">
								{pagination.total}
							</span>{" "}
							users
							{searchTerm && (
								<>
									{" "}
									matching{" "}
									<span className="font-medium text-blue-600">
										"{searchTerm}"
									</span>
								</>
							)}
							{" | "}Page{" "}
							<span className="font-semibold text-gray-900">
								{pagination.page + 1}
							</span>{" "}
							of{" "}
							<span className="font-semibold text-gray-900">
								{pagination.totalPages}
							</span>
						</p>
					</div>
				)}

				{/* Pagination Controls */}
				{pagination && pagination.totalPages > 1 && (
					<div className="mb-6 rounded-lg bg-white p-4 shadow-md">
						<div className="flex flex-wrap items-center justify-center gap-2">
							<button
								onClick={() => setCurrentPage(0)}
								disabled={loading || currentPage === 0}
								className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
							>
								First
							</button>
							<button
								onClick={() => setCurrentPage(currentPage - 1)}
								disabled={loading || currentPage === 0}
								className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
							>
								Previous
							</button>

							{/* Page numbers */}
							{Array.from(
								{ length: Math.min(5, pagination.totalPages) },
								(_, i) => {
									const startPage = Math.max(
										0,
										currentPage - 2,
									);
									const pageNumber = startPage + i;
									if (pageNumber >= pagination.totalPages)
										return null;

									return (
										<button
											key={pageNumber}
											onClick={() =>
												setCurrentPage(pageNumber)
											}
											disabled={loading}
											className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
												pageNumber === currentPage
													? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
													: "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
											} disabled:bg-gray-100 disabled:text-gray-400`}
										>
											{pageNumber + 1}
										</button>
									);
								},
							)}

							<button
								onClick={() => setCurrentPage(currentPage + 1)}
								disabled={loading || !pagination.hasMore}
								className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
							>
								Next
							</button>
							<button
								onClick={() =>
									setCurrentPage(pagination.totalPages - 1)
								}
								disabled={
									loading ||
									currentPage === pagination.totalPages - 1
								}
								className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
							>
								Last
							</button>
						</div>
					</div>
				)}
				{loading && (
					<div className="mb-6 rounded-lg bg-white p-8 shadow-md">
						<div className="flex items-center justify-center">
							<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
							<span className="ml-3 text-gray-600">
								Loading...
							</span>
						</div>
					</div>
				)}
				<div className="overflow-hidden rounded-lg bg-white shadow-md">
					<div
						className="relative overflow-auto"
						ref={tableContainerRef}
						style={{
							height: "800px",
						}}
					>
						<table className="w-full" style={{ display: "grid" }}>
							<thead
								className="border-b border-gray-200 bg-gray-50"
								style={{
									display: "grid",
									position: "sticky",
									top: 0,
									zIndex: 1,
								}}
							>
								{table.getHeaderGroups().map((headerGroup) => (
									<tr
										key={headerGroup.id}
										style={{
											display: "flex",
											width: "100%",
										}}
									>
										{headerGroup.headers.map((header) => {
											return (
												<th
													key={header.id}
													className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
													style={{
														display: "flex",
														width: header.getSize(),
													}}
												>
													<div
														{...{
															className:
																header.column.getCanSort()
																	? "cursor-pointer select-none hover:text-gray-700 flex items-center"
																	: "flex items-center",
															onClick:
																header.column.getToggleSortingHandler(),
														}}
													>
														{flexRender(
															header.column
																.columnDef
																.header,
															header.getContext(),
														)}
														<span className="ml-1">
															{{
																asc: " 🔼",
																desc: " 🔽",
															}[
																header.column.getIsSorted() as string
															] ?? null}
														</span>
													</div>
												</th>
											);
										})}
									</tr>
								))}
							</thead>
							<TableBody
								table={table}
								tableContainerRef={tableContainerRef}
							/>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
};

interface TableBodyProps {
	table: Table<IsruRow>;
	tableContainerRef: React.RefObject<HTMLDivElement | null>;
}

function TableBody({ table, tableContainerRef }: TableBodyProps) {
	const { rows } = table.getRowModel();

	// Important: Keep the row virtualizer in the lowest component possible to avoid unnecessary re-renders.
	const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
		count: rows.length,
		estimateSize: () => 33, //estimate row height for accurate scrollbar dragging
		getScrollElement: () => tableContainerRef.current,
		//measure dynamic row height, except in firefox because it measures table border height incorrectly
		measureElement:
			typeof window !== "undefined" &&
			navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});

	return (
		<tbody
			style={{
				display: "grid",
				height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
				position: "relative", //needed for absolute positioning of rows
			}}
		>
			{rowVirtualizer.getVirtualItems().map((virtualRow) => {
				const row = rows[virtualRow.index] as Row<IsruRow>;
				return (
					<TableBodyRow
						key={row.id}
						row={row}
						virtualRow={virtualRow}
						rowVirtualizer={rowVirtualizer}
					/>
				);
			})}
		</tbody>
	);
}

interface TableBodyRowProps {
	row: Row<IsruRow>;
	virtualRow: VirtualItem;
	rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
}

function TableBodyRow({ row, virtualRow, rowVirtualizer }: TableBodyRowProps) {
	return (
		<tr
			data-index={virtualRow.index} //needed for dynamic row height measurement
			ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
			key={row.id}
			className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50"
			style={{
				display: "flex",
				position: "absolute",
				transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
				width: "100%",
			}}
		>
			{row.getVisibleCells().map((cell) => {
				return (
					<td
						key={cell.id}
						className="px-4 py-3 text-sm whitespace-nowrap text-gray-900"
						style={{
							display: "flex",
							width: cell.column.getSize(),
							alignItems: "center",
						}}
					>
						{flexRender(
							cell.column.columnDef.cell,
							cell.getContext(),
						)}
					</td>
				);
			})}
		</tr>
	);
}
