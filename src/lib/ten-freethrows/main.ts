import { Game } from "./game";
import { type GameElements } from "./types";

class BasketballApp {
	private game: Game;
	private lastTime = 0;

	constructor() {
		const elements = this.getGameElements();
		this.game = new Game(elements);
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

	private startUILoop(): void {
		const loop = (currentTime: number) => {
			const dt = Math.min(0.016, (currentTime - this.lastTime) / 1000);
			this.lastTime = currentTime;

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

			requestAnimationFrame(loop);
		};

		this.lastTime = performance.now();
		requestAnimationFrame(loop);
	}
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	let loaded = false;
	const obj = document.getElementById("backgroundVideo");
	console.log("Dom loaded");
	const load = () => {
		if (
			obj &&
			"readyState" in obj &&
			(obj as HTMLVideoElement)?.readyState >= 1 &&
			!loaded
		) {
			loaded = true;
			new BasketballApp();
			const loading = document.getElementById("loading");
			if (loading) {
				loading.style.opacity = "0";
				setTimeout(() => {
					document.getElementById("loading")?.remove();
				}, 1000);
			}
		}
	};
	obj?.addEventListener("loadeddata", () => {
		load();
	});
	load();
});
