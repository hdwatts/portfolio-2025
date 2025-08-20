import { type Ball, type Hoop, type Position, type GameState } from "./types";

export class Renderer {
	private ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private backboardImage: HTMLImageElement;
	private scoreboardImage: HTMLImageElement;
	private backgroundImage: HTMLImageElement;
	private today: Date;

	constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
		this.ctx = ctx;
		this.canvas = canvas;
		this.backboardImage = new Image();
		this.backboardImage.src = "/ten-freethrows/backboard.png";
		this.scoreboardImage = new Image();
		this.scoreboardImage.src = "/ten-freethrows/scoreboard.png";
		this.backgroundImage = new Image();
		this.backgroundImage.src = "/ten-freethrows/lander.png";
		this.today = new Date();
	}

	clear(): void {
		// Clear the entire canvas for a fresh frame
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	drawBackground(): void {
		// Draw background image centered horizontally and from bottom of canvas
		if (this.backgroundImage.complete) {
			// Use display dimensions (CSS pixels), not buffer dimensions
			const dpr = window.devicePixelRatio || 1;
			const canvasWidth = this.canvas.width / dpr;
			const canvasHeight = this.canvas.height / dpr;

			// Calculate scale to maintain aspect ratio while fitting the canvas
			const imageAspectRatio =
				this.backgroundImage.width / this.backgroundImage.height;
			const canvasAspectRatio = canvasWidth / canvasHeight;

			let drawWidth: number;
			let drawHeight: number;

			// Scale image to fill the canvas while maintaining aspect ratio
			if (imageAspectRatio > canvasAspectRatio) {
				// Image is wider than canvas - fit to height
				drawHeight = canvasHeight;
				drawWidth = drawHeight * imageAspectRatio;
			} else {
				// Image is taller than canvas - fit to width
				drawWidth = canvasWidth;
				drawHeight = drawWidth / imageAspectRatio;
			}

			// Center horizontally, align to bottom of canvas
			const x = (canvasWidth - drawWidth) / 2;
			const y = canvasHeight - drawHeight;

			this.ctx.drawImage(
				this.backgroundImage,
				x,
				y,
				drawWidth,
				drawHeight,
			);
		}
	}

	drawCourt(
		ball: Ball,
		hoop: Hoop,
		ftLine: Position,
		floorY: number,
		score: number,
		shotsLeft: number,
		scale: number = 1,
	): void {
		if (ball.atRest) {
			// Free throw semicircle - scaled size
			this.ctx.strokeStyle = "rgba(255,255,255,.15)";
			this.ctx.lineWidth = 3 * scale;
			this.ctx.beginPath();
			this.ctx.arc(
				ftLine.x * scale,
				(ftLine.y - 60) * scale,
				120 * scale,
				0,
				Math.PI * 2,
				true,
			);
			this.ctx.stroke();
		}

		this.drawHoopShadow(hoop, floorY * scale, scale);

		this.drawScoreboard(
			30 * scale,
			65 * scale,
			"Month",
			"Day",
			this.today.getMonth() + 1,
			this.today.getDate(),
			scale,
		);
		this.drawScoreboard(
			30 * scale,
			175 * scale,
			"Score",
			"# Left",
			score ?? 0,
			shotsLeft ?? 0,
			scale,
		);
	}

	drawHoop(hoop: Hoop, scale: number = 1): void {
		// Draw backboard image - scaled size
		this.ctx.drawImage(
			this.backboardImage,
			(hoop.board.x - 90) * scale,
			(hoop.board.y + 30) * scale,
			160 * scale,
			600 * scale,
		);
	}

	drawScoreboard(
		x: number,
		y: number,
		label1: string,
		label2: string,
		value1: number,
		value2: number,
		scale: number = 1,
	): void {
		this.ctx.save();

		// Scale the scoreboard image
		const boardWidth = this.scoreboardImage.width * scale;
		const boardHeight = this.scoreboardImage.height * scale;
		this.ctx.drawImage(this.scoreboardImage, x, y, boardWidth, boardHeight);

		this.ctx.fillStyle = "#D6C1A1";
		this.ctx.font = `${14 * scale}px Visitor`;
		const label1Width = this.ctx.measureText(label1).width;
		const label2Width = this.ctx.measureText(label2).width;
		this.ctx.fillText(
			label1,
			x + 64 * scale - label1Width / 2,
			y + 88 * scale,
		);
		this.ctx.fillText(
			label2,
			x + 137 * scale - label2Width / 2,
			y + 88 * scale,
		);
		this.ctx.fillStyle = "#D6C1A1";
		this.ctx.font = `${44 * scale}px Visitor`;
		const stringValue1 = value1 < 10 ? `0${value1}` : `${value1}`;
		const stringValue2 = value2 < 10 ? `0${value2}` : `${value2}`;
		const value1Width = this.ctx.measureText(stringValue1).width;
		const value2Width = this.ctx.measureText(stringValue2).width;
		this.ctx.fillText(
			stringValue1,
			x + 65 * scale - value1Width / 2,
			y + 60 * scale,
		);
		if (value2 === 0) {
			this.ctx.fillStyle = "#C72C48";
		}
		this.ctx.fillText(
			stringValue2,
			x + 139 * scale - value2Width / 2,
			y + 60 * scale,
		);
		this.ctx.restore();
	}

	drawBallTrail(ball: Ball, scale: number = 1): void {
		// Trail only (ball itself is rendered by Matter.js)
		if (ball.trail.length > 1) {
			this.ctx.lineWidth = 2 * scale;
			this.ctx.strokeStyle = "rgba(255,255,255,.2)";
			this.ctx.beginPath();
			for (let i = 0; i < ball.trail.length; i++) {
				const p = ball.trail[i];
				if (i === 0) this.ctx.moveTo(p.x * scale, p.y * scale);
				else this.ctx.lineTo(p.x * scale, p.y * scale);
			}
			this.ctx.stroke();
		}

		// Ball glow on swish
		if (ball.swish) {
			const ballX = ball.body.position.x * scale;
			const ballY = ball.body.position.y * scale;
			const grd = this.ctx.createRadialGradient(
				ballX,
				ballY,
				ball.r * 0.3 * scale,
				ballX,
				ballY,
				ball.r * 2.8 * scale,
			);
			grd.addColorStop(0, "rgba(255,200,80,.35)");
			grd.addColorStop(1, "rgba(255,200,80,0)");
			this.ctx.fillStyle = grd;
			this.ctx.beginPath();
			this.ctx.arc(ballX, ballY, ball.r * 2.8 * scale, 0, Math.PI * 2);
			this.ctx.fill();
		}
	}

	drawBall(ball: Ball): void {
		this.drawBallTrail(ball);
	}

	drawHoopShadow(hoop: Hoop, floorY: number, scale: number = 1): void {
		const shadowX = hoop.right.x * scale;
		const shadowY = floorY - 10; // Shadow is always on the display floor
		const shadowRadius = 90 * scale;
		const shadowOpacity = 0.6;

		// Create elliptical shadow (flattened circle)
		this.ctx.save();
		this.ctx.globalAlpha = shadowOpacity;

		// Create radial gradient for realistic shadow
		const gradient = this.ctx.createRadialGradient(
			shadowX,
			shadowY,
			0,
			shadowX,
			shadowY,
			shadowRadius,
		);
		gradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");
		gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.2)");
		gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

		this.ctx.fillStyle = gradient;

		// Draw flattened ellipse for shadow
		this.ctx.beginPath();
		this.ctx.ellipse(
			shadowX,
			shadowY,
			shadowRadius,
			shadowRadius * 0.3, // Flatten the shadow vertically
			0,
			0,
			Math.PI * 2,
		);
		this.ctx.fill();

		this.ctx.restore();
	}

	drawBallShadow(ball: Ball, floorY: number, scale: number = 1): void {
		if (!ball.shadow || ball.shadow.opacity <= 0) return;

		const shadowX = ball.shadow.x * scale - 10 * scale;
		const shadowY = ball.shadow.y * scale; // - 30 * scale; // Shadow position scaled consistently
		const shadowRadius = ball.shadow.radius * scale;
		const shadowOpacity = ball.shadow.opacity;

		// Create elliptical shadow (flattened circle)
		this.ctx.save();
		this.ctx.globalAlpha = shadowOpacity;

		// Create radial gradient for realistic shadow
		const gradient = this.ctx.createRadialGradient(
			shadowX,
			shadowY,
			0,
			shadowX,
			shadowY,
			shadowRadius,
		);
		gradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");
		gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.2)");
		gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

		this.ctx.fillStyle = gradient;

		// Draw flattened ellipse for shadow
		this.ctx.beginPath();
		this.ctx.ellipse(
			shadowX,
			shadowY,
			shadowRadius,
			shadowRadius * 0.3, // Flatten the shadow vertically
			0,
			0,
			Math.PI * 2,
		);
		this.ctx.fill();

		this.ctx.restore();
	}

	drawAim(
		ball: Ball,
		input: {
			dragging: boolean;
			sx: number;
			sy: number;
			cx: number;
			cy: number;
		},
		scale: number = 1,
	): void {
		if (input.dragging && ball.atRest) {
			const dx = input.sx - input.cx;
			const dy = input.sy - input.cy;
			const len = Math.min(180, Math.hypot(dx, dy));
			const ang = Math.atan2(dy, dx);
			const ax = ball.body.position.x * scale;
			const ay = ball.body.position.y * scale;

			this.ctx.strokeStyle = "rgba(255,255,255,.7)";
			this.ctx.lineWidth = 2 * scale;
			this.ctx.setLineDash([6 * scale, 6 * scale]);
			this.ctx.beginPath();
			this.ctx.moveTo(ax, ay);
			this.ctx.lineTo(
				ax + Math.cos(ang) * len * scale,
				ay + Math.sin(ang) * len * scale,
			);
			this.ctx.stroke();
			this.ctx.setLineDash([]);

			// Power dots
			for (let i = 0; i < 5; i++) {
				const t = (i + 1) / 6;
				const px = ax + Math.cos(ang) * len * scale * t;
				const py = ay + Math.sin(ang) * len * scale * t;
				this.ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.12 * i})`;
				this.ctx.beginPath();
				this.ctx.arc(px, py, (3 + i * 0.4) * scale, 0, Math.PI * 2);
				this.ctx.fill();
			}
		}
	}

	drawGameOverOverlay(state: GameState): void {
		if (!state.practice && state.shotsLeft === 0) {
			this.ctx.save();
			const cw = this.canvas.width;
			const ch = this.canvas.height;

			this.ctx.fillStyle = "rgba(0,0,0,.25)";
			this.ctx.fillRect(0, 0, cw, ch);
			this.ctx.fillStyle = "#fff";
			this.ctx.textAlign = "center";
			this.ctx.font = "50px Visitor";
			this.ctx.fillText(`Day Over`, cw / 2, ch * 0.52);
			this.ctx.font = "24px Visitor";
			this.ctx.fillText(
				`You have played ${state.daysInARow} day${state.daysInARow !== 1 ? "s" : ""} in a row.`,
				cw / 2,
				ch * 0.56,
			);
			this.ctx.font = "16px Visitor";
			this.ctx.fillText(`Crafted by @hdwatts`, cw / 2, ch * 0.99);
			this.ctx.restore();
		}
	}
}
