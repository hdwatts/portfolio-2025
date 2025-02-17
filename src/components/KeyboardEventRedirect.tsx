import { useEffect, useRef, useState } from "react";
import { navigate } from "astro:transitions/client";

export const KeyboardEventRedirect = ({
	targetKey,
	url,
	...opts
}: Omit<useKeyPressOptions, "callback"> & {
	url: string;
	targetKey: string;
}) => {
	useKeyPress(targetKey, {
		...opts,
		callback: () => navigate(url),
	});
	return <div />;
};

interface useKeyPressOptions {
	shiftKey?: boolean;
	metaKey?: boolean;
	// Legacy -- resolve when possible
	// eslint-disable-next-line @typescript-eslint/ban-types
	callback?: Function;
	prevent?: boolean;
}

const useKeyPress = (targetKey: string, opts: useKeyPressOptions = {}) => {
	// State for keeping track of whether key is pressed
	const [keyPressed, setKeyPressed] = useState(false);

	// Legacy -- resolve when possible
	// eslint-disable-next-line @typescript-eslint/ban-types
	const callback = useRef<Function | undefined>(undefined);

	// Ensure callback gets reset
	useEffect(() => {
		callback.current = opts.callback;
	}, [opts.callback]);

	// If pressed key is our target key then set to true
	const downHandler = (event: KeyboardEvent) => {
		if (
			(event.key?.toLowerCase() === targetKey?.toLowerCase() ||
				event.code?.toLowerCase() === targetKey?.toLowerCase() ||
				event.code === `Digit${targetKey?.toLowerCase()}`) &&
			(opts.shiftKey === undefined || opts.shiftKey === event.shiftKey) &&
			(opts.metaKey === undefined ||
				(opts.metaKey && (event.ctrlKey || event.metaKey))) // Support mac (meta = command) and Windows (meta = ctrl)
		) {
			if (callback.current) {
				callback.current(event);
			}
			setKeyPressed(true);
			if (opts.prevent) {
				event.preventDefault();
				event.stopPropagation();
			}
		}
	};

	const upHandler = (event: KeyboardEvent) => {
		if (event.key === targetKey) {
			setKeyPressed(false);
		}
	};

	useEffect(
		() => {
			window.addEventListener("keydown", downHandler);
			window.addEventListener("keyup", upHandler);
			return () => {
				window.removeEventListener("keydown", downHandler);
				window.removeEventListener("keyup", upHandler);
			};
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	return keyPressed;
};
