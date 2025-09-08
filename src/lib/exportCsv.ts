type ColumnDef<T> = Array<keyof T> | Array<{ key: keyof T; header?: string }>;

interface DownloadCSVOptions<T> {
	filename?: string; // default: "data.csv"
	delimiter?: string; // default: ","
	includeHeaders?: boolean; // default: true
	includeBOM?: boolean; // default: true (helps Excel)
	columns?: ColumnDef<T>; // default: keys of the first row
	formatValue?: (value: unknown, key: keyof T, row: T) => unknown; // optional formatter
	newline?: "\r\n" | "\n"; // default: "\r\n"
}

/**
 * Converts an array of (consistent) objects to CSV and downloads it.
 */
export function downloadCSVFromObjects<T extends Record<string, unknown>>(
	rows: T[],
	opts: DownloadCSVOptions<T> = {},
): void {
	if (!Array.isArray(rows)) {
		throw new Error("Expected an array of objects.");
	}
	if (rows.length === 0) {
		// You can choose to allow empty CSVs; this throws to surface mistakes.
		throw new Error("Cannot build CSV from an empty array.");
	}

	const {
		filename = "data.csv",
		delimiter = ",",
		includeHeaders = true,
		includeBOM = true,
		newline = "\r\n",
		formatValue,
	} = opts;

	// Normalize columns (either ["id","name"] or [{key:"id", header:"ID"}, ...])
	let columns: Array<{ key: keyof T; header: string }>;
	if (opts.columns && opts.columns.length > 0) {
		columns = (opts.columns as Array<any>).map((col) =>
			typeof col === "object"
				? { key: col.key, header: col.header ?? String(col.key) }
				: { key: col, header: String(col) },
		);
	} else {
		const first = rows[0];
		const keys = Object.keys(first) as Array<keyof T>;
		columns = keys.map((k) => ({ key: k, header: String(k) }));
	}

	// RFC-4180 style escaping
	const escapeCSV = (value: unknown): string => {
		// Null/undefined → empty cell
		let str = value == null ? "" : String(value);
		// Double quotes are doubled per RFC
		if (str.includes('"')) str = str.replace(/"/g, '""');
		// Quote the field if it has delimiter, quotes, or newlines
		if (str.includes('"') || str.includes(delimiter) || /\r|\n/.test(str)) {
			str = `"${str}"`;
		}
		return str;
	};

	const headerLine = includeHeaders
		? columns.map((c) => escapeCSV(c.header)).join(delimiter) + newline
		: "";

	const body = rows
		.map((row) =>
			columns
				.map(({ key }) => {
					const raw = formatValue
						? formatValue(row[key], key, row)
						: row[key];
					return escapeCSV(raw);
				})
				.join(delimiter),
		)
		.join(newline);

	// Build final CSV string, optionally with BOM for Excel
	const csvString =
		(includeBOM ? "\uFEFF" : "") + headerLine + body + newline;

	// Trigger browser download
	const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	// Some environments (Safari) require it to be in the DOM
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	// Cleanup
	URL.revokeObjectURL(url);
}
