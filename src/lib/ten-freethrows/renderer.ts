import { type Ball, type Hoop, type Position, type GameState } from "./types";

export class Renderer {
	private ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private backboardImage: HTMLImageElement;
	private scoreboardImage: HTMLImageElement;
	private today: Date;

	constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
		this.ctx = ctx;
		this.canvas = canvas;
		this.backboardImage = new Image();
		this.backboardImage.src = "/ten-freethrows/backboard.png";
		this.scoreboardImage = new Image();
		this.scoreboardImage.src = "/ten-freethrows/scoreboard.png";
		this.today = new Date();
	}

	clear(): void {
		// Clear the entire canvas for a fresh frame
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	drawCourt(
		ball: Ball,
		hoop: Hoop,
		ftLine: Position,
		floorY: number,
		score: number,
		shotsLeft: number,
	): void {
		if (ball.atRest) {
			// Free throw semicircle - fixed size
			this.ctx.strokeStyle = "rgba(255,255,255,.15)";
			this.ctx.lineWidth = 3;
			this.ctx.beginPath();
			this.ctx.arc(ftLine.x, ftLine.y - 60, 120, 0, Math.PI * 2, true);
			this.ctx.stroke();
		}

		this.drawHoopShadow(hoop, floorY);

		this.drawScoreboard(
			30,
			65,
			"Month",
			"Day",
			this.today.getMonth() + 1,
			this.today.getDate(),
		);
		this.drawScoreboard(
			30,
			175,
			"Score",
			"# Left",
			score ?? 0,
			shotsLeft ?? 0,
		);
	}

	drawHoop(hoop: Hoop): void {
		// Draw backboard image - fixed size
		this.ctx.drawImage(
			this.backboardImage,
			hoop.board.x - 90,
			hoop.board.y + 30,
			160,
			600,
		);
	}

	drawScoreboard(
		x: number,
		y: number,
		label1: string,
		label2: string,
		value1: number,
		value2: number,
	): void {
		this.ctx.save();
		this.ctx.drawImage(this.scoreboardImage, x, y);
		this.ctx.fillStyle = "#D6C1A1";
		this.ctx.font = "14px Visitor";
		const label1Width = this.ctx.measureText(label1).width;
		const label2Width = this.ctx.measureText(label2).width;
		this.ctx.fillText(label1, x + 64 - label1Width / 2, y + 88);
		this.ctx.fillText(label2, x + 137 - label2Width / 2, y + 88);
		this.ctx.fillStyle = "#D6C1A1";
		this.ctx.font = "44px Visitor";
		const stringValue1 = value1 < 10 ? `0${value1}` : `${value1}`;
		const stringValue2 = value2 < 10 ? `0${value2}` : `${value2}`;
		const value1Width = this.ctx.measureText(stringValue1).width;
		const value2Width = this.ctx.measureText(stringValue2).width;
		this.ctx.fillText(stringValue1, x + 65 - value1Width / 2, y + 60);
		if (value2 === 0) {
			this.ctx.fillStyle = "#C72C48";
		}
		this.ctx.fillText(stringValue2, x + 139 - value2Width / 2, y + 60);
		this.ctx.restore();
	}

	drawBallTrail(ball: Ball): void {
		// Trail only (ball itself is rendered by Matter.js)
		if (ball.trail.length > 1) {
			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = "rgba(255,255,255,.2)";
			this.ctx.beginPath();
			for (let i = 0; i < ball.trail.length; i++) {
				const p = ball.trail[i];
				if (i === 0) this.ctx.moveTo(p.x, p.y);
				else this.ctx.lineTo(p.x, p.y);
			}
			this.ctx.stroke();
		}

		// Ball glow on swish
		if (ball.swish) {
			const ballX = ball.body.position.x;
			const ballY = ball.body.position.y;
			const grd = this.ctx.createRadialGradient(
				ballX,
				ballY,
				ball.r * 0.3,
				ballX,
				ballY,
				ball.r * 2.8,
			);
			grd.addColorStop(0, "rgba(255,200,80,.35)");
			grd.addColorStop(1, "rgba(255,200,80,0)");
			this.ctx.fillStyle = grd;
			this.ctx.beginPath();
			this.ctx.arc(ballX, ballY, ball.r * 2.8, 0, Math.PI * 2);
			this.ctx.fill();
		}
	}

	drawBall(ball: Ball): void {
		this.drawBallTrail(ball);
	}

	drawHoopShadow(hoop: Hoop, floorY: number): void {
		const shadowX = hoop.right.x;
		const shadowY = floorY - 10; // Shadow is always on the floor
		const shadowRadius = 90;
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

	drawBallShadow(ball: Ball, floorY: number): void {
		if (!ball.shadow || ball.shadow.opacity <= 0) return;

		const shadowX = ball.shadow.x - 10;
		const shadowY = floorY - 30; // Shadow is always on the floor
		const shadowRadius = ball.shadow.radius;
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
	): void {
		if (input.dragging && ball.atRest) {
			const dx = input.sx - input.cx;
			const dy = input.sy - input.cy;
			const len = Math.min(180, Math.hypot(dx, dy));
			const ang = Math.atan2(dy, dx);
			const ax = ball.body.position.x;
			const ay = ball.body.position.y;

			this.ctx.strokeStyle = "rgba(255,255,255,.7)";
			this.ctx.lineWidth = 2;
			this.ctx.setLineDash([6, 6]);
			this.ctx.beginPath();
			this.ctx.moveTo(ax, ay);
			this.ctx.lineTo(ax + Math.cos(ang) * len, ay + Math.sin(ang) * len);
			this.ctx.stroke();
			this.ctx.setLineDash([]);

			// Power dots
			for (let i = 0; i < 5; i++) {
				const t = (i + 1) / 6;
				const px = ax + Math.cos(ang) * len * t;
				const py = ay + Math.sin(ang) * len * t;
				this.ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.12 * i})`;
				this.ctx.beginPath();
				this.ctx.arc(px, py, 3 + i * 0.4, 0, Math.PI * 2);
				this.ctx.fill();
			}
		}
	}

	drawGameOverOverlay(state: GameState): void {
		if (!state.practice && state.shotsLeft === 0) {
			this.ctx.save();
			const cw = this.canvas.width;
			const ch = this.canvas.height;

			this.ctx.fillStyle = "rgba(0,0,0,.45)";
			this.ctx.fillRect(0, 0, cw, ch);
			this.ctx.fillStyle = "#fff";
			this.ctx.textAlign = "center";
			this.ctx.font =
				"700 26px system-ui, -apple-system, Segoe UI, Roboto";
			this.ctx.fillText(
				`Round Over — Score ${state.score}/10`,
				cw / 2,
				ch * 0.42,
			);
			this.ctx.font =
				"500 16px system-ui, -apple-system, Segoe UI, Roboto";
			this.ctx.fillText(
				`Best Streak ${state.bestStreak}  ·  Press R to restart`,
				cw / 2,
				ch * 0.46,
			);
			this.ctx.restore();
		}
	}
}
