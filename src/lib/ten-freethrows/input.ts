import { type Input, type Ball, type GameState } from "./types";

export class InputManager {
	private input: Input = {
		down: false,
		sx: 0,
		sy: 0,
		cx: 0,
		cy: 0,
		dragging: false,
	};

	private canvas: HTMLCanvasElement;
	private onShoot: (vx: number, vy: number) => void;
	private onRestart: () => void;
	private onTogglePractice: () => void;

	constructor(
		canvas: HTMLCanvasElement,
		onShoot: (vx: number, vy: number) => void,
		onRestart: () => void,
		onTogglePractice: () => void,
	) {
		this.canvas = canvas;
		this.onShoot = onShoot;
		this.onRestart = onRestart;
		this.onTogglePractice = onTogglePractice;
		this.setupEventListeners();
	}

	getInput(): Input {
		return this.input;
	}

	private setupEventListeners(): void {
		// Mouse events
		this.canvas.addEventListener("mousedown", (e) => {
			const r = this.canvas.getBoundingClientRect();
			this.pointerDown(e.clientX - r.left, e.clientY - r.top);
		});

		window.addEventListener("mousemove", (e) => {
			if (!this.input.down) return;
			const r = this.canvas.getBoundingClientRect();
			this.pointerMove(e.clientX - r.left, e.clientY - r.top);
		});

		window.addEventListener("mouseup", () => this.pointerUp());

		// Touch events
		this.canvas.addEventListener(
			"touchstart",
			(e) => {
				const t = e.changedTouches[0];
				const r = this.canvas.getBoundingClientRect();
				this.pointerDown(t.clientX - r.left, t.clientY - r.top);
				e.preventDefault();
			},
			{ passive: false },
		);

		window.addEventListener(
			"touchmove",
			(e) => {
				if (!this.input.down) return;
				const t = e.changedTouches[0];
				const r = this.canvas.getBoundingClientRect();
				this.pointerMove(t.clientX - r.left, t.clientY - r.top);
				e.preventDefault();
			},
			{ passive: false },
		);

		window.addEventListener("touchend", () => this.pointerUp());

		// Keyboard events
		window.addEventListener("keydown", (e) => {
			if (e.key === "r" || e.key === "R") {
				this.onRestart();
			}
			if (e.key === "p" || e.key === "P") {
				this.onTogglePractice();
			}
		});
	}

	private pointerDown(x: number, y: number): void {
		this.input.down = true;
		this.input.sx = x;
		this.input.sy = y;
		this.input.cx = x;
		this.input.cy = y;
	}

	private pointerMove(x: number, y: number): void {
		this.input.cx = x;
		this.input.cy = y;
	}

	private pointerUp(): void {
		if (this.input.dragging) {
			const dx = this.input.sx - this.input.cx;
			const dy = this.input.sy - this.input.cy;
			const rawPower = Math.hypot(dx, dy);
			const maxPower = 180;
			const clampedPower = Math.min(maxPower, rawPower);
			const norm = rawPower === 0 ? 0 : clampedPower / rawPower;
			const vx = (dx * norm) / 6;
			const vy = (dy * norm) / 6;
			this.onShoot(vx, vy);
		}
		this.input.down = false;
		this.input.dragging = false;
	}

	updateDragging(ball: Ball, state: GameState): void {
		this.input.dragging =
			this.input.down &&
			ball.atRest &&
			(state.practice || state.shotsLeft > 0);
	}
}
