import { useEffect, useRef, useState } from "react";
import {
	useVirtualizer,
	type VirtualItem,
	Virtualizer,
} from "@tanstack/react-virtual";
import {
	useReactTable,
	getFilteredRowModel,
	getCoreRowModel,
	createColumnHelper,
	flexRender,
	type Row,
	type Table,
	type ColumnDef,
	type ColumnFiltersState,
} from "@tanstack/react-table";

type IsruRow = {
	rank: number;
	username: string;
	total_points: number;
};

const columnHelper = createColumnHelper<IsruRow>();

const columns: ColumnDef<IsruRow>[] = [
	{
		id: "rank",
		header: "Rank",
		accessorKey: "idx",
	},
	{
		id: "isru_id",
		header: "ISRU ID",
		accessorKey: "isru_id",
	},
	{
		id: "username",
		header: "Username",
		accessorKey: "username",
		filterFn: "includesString",
	},
	{
		id: "total_points",
		header: "Total Points",
		accessorKey: "total_points",
	},
];

export const IsruStats = () => {
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const [data, setData] = useState<IsruRow[] | null>(null);
	const [textInput, setTextInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				const response = await fetch("/api/leaderboard");
				const data = await response.json();
				setData(
					data.map((i: IsruRow, idx: number) => ({
						...i,
						idx: idx + 1,
					})),
				);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	const table = useReactTable({
		data: data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(), // needed for client-side filtering
		state: {
			columnFilters,
		},
		onColumnFiltersChange: setColumnFilters,
	});

	return (
		<div>
			<h1>IsruStats</h1>
			<p>
				<i>Last updated at 12:05 PM EST on September 6, 2025.</i>
			</p>
			<h2>What is this?</h2>
			<p>
				The goal of this project is to provide an accurate snapshot of
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
					season, and bonuses. The bonuses are filtered out because
					they are calculated as of EST, so users in Asia and Europe
					got red badge upgrades for dates after camp.{" "}
					<b>
						We do not know if ISRU will take this into account, but
						it should be safe to assume!
					</b>
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
				<li>Only count a single "Shared their Movie" submission.</li>
				<li>
					Tie breaking based on the internal ISRU ID of each user.
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
					{data ? data?.length : "Loading..."} users in the database.
				</b>
			</p>
			<p>
				<b style={{ color: "orange" }}>
					Additionally, I haven't created any logic around excellence
					bonuses given out after I started crawling. I will do that
					once we have a good initial dataset.
				</b>
			</p>
			<p>
				The request for user data could have failed at various points.
				If it failed during the gathering of the user's point history,
				it may lead to inaccurate data. If you believe this happened to
				you, please contact <b>@MiNiMAL</b> on the bootleg discord or{" "}
				<a
					href="https://isrucamp.com/leaderboard#hdwatts"
					target="_blank"
				>
					@hdwatts on ISRU
				</a>
				.
			</p>
			<div>
				<input
					type="text"
					disabled={loading}
					placeholder="Search for username..."
					style={{ width: 500 }}
					value={textInput}
					onChange={(e) => {
						const value = e.target.value;
						setTextInput(value);
						setColumnFilters(
							value.length > 0 ? [{ id: "username", value }] : [],
						);
					}}
				/>
			</div>
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
