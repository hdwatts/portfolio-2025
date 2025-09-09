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
					{((row.original.rank / totalActiveUsers) * 100).toFixed(3)}%
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

	const fetchData = async (page: number = 0, search: string = "") => {
		setLoading(true);
		try {
			const searchParams = new URLSearchParams({
				page: page.toString(),
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
		fetchData(currentPage, searchTerm);
	}, [currentPage, searchTerm]);

	const table = useReactTable({
		data: data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div>
			<h1>IsruStats</h1>
			<p>
				<i>Last updated at: {lastUpdatedAt}.</i>
			</p>
			<h2>What is this?</h2>
			<p>
				The goal of this project is to provide an estimated snapshot of
				the leaderboard <b>as of the end of camp</b> + excellence after
				camp. It aims to accomplish this by:
			</p>
			<ol>
				<li>
					Scraping the current state of the leaderboard from the ISRU
					API.
				</li>
				<li>
					Filtering out all points that were earned in preseason, post
					season, and streak/rankup bonuses. The bonuses are filtered
					out because:
					<ul>
						<li>
							Bonuses are calculated as of EST, so users in Asia
							and Europe got red badge upgrades for dates after
							camp.
						</li>
						<li>
							A small subset of users have a "double badge rank up
							to yellow" glitch for Ten Free throws, giving them
							an extra 14 points. This feels wrong to me.
						</li>
						<li>
							<b>
								We do not know if ISRU will take the above into
								account!
							</b>
						</li>
					</ul>
				</li>
				<li>
					Keeping all negative adjustments that occur in the post
					season, as the moderating team is adjusting the points after
					the deadline.
				</li>
				<li>
					Dynamically calculating the streak bonuses for each user.
				</li>
				<li>
					Dynamically calculating the cumulative point bonuses for
					each user.
				</li>
				<li>
					Ten users have Wall Drawing points on the day before the
					wall drawing challenge was supposed to begin. I have
					filtered those out when it comes to streaks, as they end up
					with an extra 30 points that no other user can get.
				</li>
				<li>
					If a user used make up points and end up earning double
					cumulative point bonuses, those are currently not being
					counted. TBD on how I will handle those. See user: "dizzy"
					who had two Ten Free Throw bonuses and also used a make up
					day to fill in the gap.
				</li>
				<li>
					Turn any point reversals from deleted submissions to just -1
					point, as streaks and bonuses are now dynamically
					calculated.
				</li>
				<li>
					Only count a single "Shared their Movie" submission as 101
					points. The reason we include the bonus 100 points no matter
					what is because it gets calculated in EST, so PST users who
					uploaded at like 10PM on the last day would end up with a
					100 point bonus recorded after the deadline.{" "}
					<b>
						This feels wrong to me, so I include those points, but
						we don't know how ISRU will handle it.
					</b>
				</li>
				<li>
					Doubled up points are not counted for cumulative point
					bonuses, even if they haven't been caught by mods. See users
					like "taichi" who have multiple points. They are currently
					still counted as normal points as it is too difficult to
					filter out.
				</li>
				<li>
					Tie breaking based on the internal ISRU ID of each user.
				</li>
				<li>
					Percentile is based on the current total number of active
					users: {totalActiveUsers}.
				</li>
			</ol>
			<h2>
				Additional Disclaimers - Please Read Before Asking Questions:
			</h2>
			<p>
				<b style={{ color: "red" }}>
					This is currently under very active development and should
					not be viewed as a 100% accurate snapshot of the
					leaderboard. I still haven't even scraped all the data yet,
					as of right now there are{" "}
					{pagination ? pagination.total : "Loading..."} users in the
					database.
				</b>
			</p>
			<p>
				<b style={{ color: "orange" }}>
					Postseason excellence is working but it is a manual process.
					If you received excellence after the "Last Updated At" date
					above then it is not yet reflected in the leaderboard. I run
					the script pretty often, so it should be updated in due
					time!
				</b>
			</p>
			<p>
				The request for user data could have failed at various points.
				If it failed during the gathering of the user's point history,
				it may lead to inaccurate data. If you believe this happened to
				you, please contact <b>@MiNiMAL</b> on the bootleg discord aka{" "}
				<a
					href="https://isrucamp.com/leaderboard#hdwatts"
					target="_blank"
				>
					@hdwatts on ISRU
				</a>
				.
			</p>
			<div style={{ marginBottom: "20px" }}>
				<input
					type="text"
					disabled={loading}
					placeholder="Search for username..."
					style={{ width: 500, marginRight: "10px" }}
					value={textInput}
					onChange={(e) => {
						const value = e.target.value;
						setTextInput(value);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							setSearchTerm(textInput);
							setCurrentPage(0); // Reset to first page on search
						}
					}}
				/>
				<button
					onClick={() => {
						setSearchTerm(textInput);
						setCurrentPage(0);
					}}
					disabled={loading}
					style={{ marginRight: "10px" }}
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
						style={{ marginLeft: "10px" }}
					>
						Clear Search
					</button>
				)}
			</div>

			{/* Pagination Info */}
			{pagination && (
				<div style={{ marginBottom: "10px" }}>
					<p>
						Showing {data?.length || 0} of {pagination.total} users
						{searchTerm && ` matching "${searchTerm}"`}
						{" | "}Page {pagination.page + 1} of{" "}
						{pagination.totalPages}
					</p>
				</div>
			)}

			{/* Pagination Controls */}
			{pagination && pagination.totalPages > 1 && (
				<div style={{ marginBottom: "20px" }}>
					<button
						onClick={() => setCurrentPage(0)}
						disabled={loading || currentPage === 0}
						style={{ marginRight: "5px" }}
					>
						First
					</button>
					<button
						onClick={() => setCurrentPage(currentPage - 1)}
						disabled={loading || currentPage === 0}
						style={{ marginRight: "5px" }}
					>
						Previous
					</button>

					{/* Page numbers */}
					{Array.from(
						{ length: Math.min(5, pagination.totalPages) },
						(_, i) => {
							const startPage = Math.max(0, currentPage - 2);
							const pageNumber = startPage + i;
							if (pageNumber >= pagination.totalPages)
								return null;

							return (
								<button
									key={pageNumber}
									onClick={() => setCurrentPage(pageNumber)}
									disabled={loading}
									style={{
										marginRight: "5px",
										backgroundColor:
											pageNumber === currentPage
												? "#007bff"
												: "transparent",
										color:
											pageNumber === currentPage
												? "white"
												: "black",
									}}
								>
									{pageNumber + 1}
								</button>
							);
						},
					)}

					<button
						onClick={() => setCurrentPage(currentPage + 1)}
						disabled={loading || !pagination.hasMore}
						style={{ marginLeft: "5px", marginRight: "5px" }}
					>
						Next
					</button>
					<button
						onClick={() =>
							setCurrentPage(pagination.totalPages - 1)
						}
						disabled={
							loading || currentPage === pagination.totalPages - 1
						}
						style={{ marginLeft: "5px" }}
					>
						Last
					</button>
				</div>
			)}
			{loading ? <div>Loading...</div> : null}
			<div
				className="container"
				ref={tableContainerRef}
				style={{
					overflow: "auto", //our scrollable table container
					position: "relative", //needed for sticky header
					height: "800px", //should be a fixed height
				}}
			>
				<table style={{ display: "grid" }}>
					<thead
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
								style={{ display: "flex", width: "100%" }}
							>
								{headerGroup.headers.map((header) => {
									return (
										<th
											key={header.id}
											style={{
												display: "flex",
												width: header.getSize(),
											}}
										>
											<div
												{...{
													className:
														header.column.getCanSort()
															? "cursor-pointer select-none"
															: "",
													onClick:
														header.column.getToggleSortingHandler(),
												}}
											>
												{flexRender(
													header.column.columnDef
														.header,
													header.getContext(),
												)}
												{{
													asc: " 🔼",
													desc: " 🔽",
												}[
													header.column.getIsSorted() as string
												] ?? null}
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
						style={{
							display: "flex",
							width: cell.column.getSize(),
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
