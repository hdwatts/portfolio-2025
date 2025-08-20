import { Game } from "./game";
import { type GameElements } from "./types";

class BasketballApp {
	private game: Game | null = null;
	private lastTime = 0;
	private elements: GameElements;

	constructor() {
		this.elements = this.getGameElements();
		this.game = new Game(this.elements);
		this.setupCanvas();
		this.setupResizeListener();
		this.startUILoop();
	}

	private getGameElements(): GameElements {
		const canvas = document.getElementById("game") as HTMLCanvasElement;
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Could not get 2D context from canvas");
		}

		// const scoreEl = document.getElementById("score");
		// const shotsEl = document.getElementById("shots");
		// const resetBtn = document.getElementById("resetBtn");
		const toast = document.getElementById("toast");

		if (!toast) {
			throw new Error("Could not find required DOM elements");
		}

		return {
			canvas,
			ctx,
			toast,
		};
	}

	private setupCanvas(): void {
		this.resizeCanvas();
	}

	private setupResizeListener(): void {
		window.addEventListener("resize", () => {
			this.resizeCanvas();
		});
	}

	private resizeCanvas(): void {
		const canvas = this.elements.canvas;
		const container = canvas.parentElement;
		if (!container) return;

		// Get the container's actual dimensions
		const containerRect = container.getBoundingClientRect();
		const containerWidth = containerRect.width;
		const containerHeight = containerRect.height;

		// Calculate dimensions maintaining 3:2 aspect ratio
		let canvasWidth: number;
		let canvasHeight: number;

		const containerAspectRatio = containerWidth / containerHeight;
		const targetAspectRatio = 3 / 2; // 1.5

		if (containerAspectRatio > targetAspectRatio) {
			// Container is wider than our target aspect ratio - fit to height
			canvasHeight = containerHeight;
			canvasWidth = canvasHeight * targetAspectRatio;
		} else {
			// Container is taller than our target aspect ratio - fit to width
			canvasWidth = containerWidth;
			canvasHeight = canvasWidth / targetAspectRatio;
		}

		// Set the canvas display size (CSS pixels)
		canvas.style.width = `${canvasWidth}px`;
		canvas.style.height = `${canvasHeight}px`;

		// Set the canvas buffer size (actual pixels for high DPI)
		const dpr = window.devicePixelRatio || 1;
		canvas.width = canvasWidth * dpr;
		canvas.height = canvasHeight * dpr;

		// Reset context transform and scale to match device pixel ratio
		this.elements.ctx.resetTransform();
		this.elements.ctx.scale(dpr, dpr);

		// Notify game of dimension changes
		if (this.game) {
			this.game.handleResize();
		}
	}

	private startUILoop(): void {
		const loop = (currentTime: number) => {
			const dt = Math.min(0.016, (currentTime - this.lastTime) / 1000);
			this.lastTime = currentTime;

			if (this.game) {
				// Update game logic (scoring, input, etc) but physics runs independently
				this.game.update(dt);

				// Clear canvas for fresh frame
				this.game.clearCanvas();

				// Draw elements that should appear UNDER the Matter.js physics bodies
				this.game.drawUnderlay();

				// Manually render the Matter.js physics bodies
				this.game.drawPhysicsBodies();

				// Draw elements that should appear OVER the Matter.js physics bodies
				this.game.drawOverlay();
			}

			requestAnimationFrame(loop);
		};

		this.lastTime = performance.now();
		requestAnimationFrame(loop);
	}
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	let loaded = false;

	console.log("Dom loaded");
	const load = () => {
		loaded = true;
		new BasketballApp();
		const loading = document.getElementById("loading");
		if (loading) {
			loading.style.opacity = "0";
			setTimeout(() => {
				document.getElementById("loading")?.remove();
			}, 1000);
		}
	};

	load();
});
