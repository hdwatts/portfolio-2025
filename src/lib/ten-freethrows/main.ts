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

		const scoreEl = document.getElementById("score");
		const shotsEl = document.getElementById("shots");
		const resetBtn = document.getElementById("resetBtn");
		const toast = document.getElementById("toast");

		if (!scoreEl || !shotsEl || !resetBtn || !toast) {
			throw new Error("Could not find required DOM elements");
		}

		return {
			canvas,
			ctx,
			scoreEl,
			shotsEl,
			resetBtn,
			toast,
		};
	}

	private startUILoop(): void {
		const loop = (currentTime: number) => {
			const dt = Math.min(0.016, (currentTime - this.lastTime) / 1000);
			this.lastTime = currentTime;

			// Update game logic (scoring, input, etc) but physics runs independently
			this.game.update(dt);

			// Draw UI overlay (trail, aiming, court decorations)
			this.game.drawOverlay();

			requestAnimationFrame(loop);
		};

		this.lastTime = performance.now();
		requestAnimationFrame(loop);
	}
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	new BasketballApp();
});
