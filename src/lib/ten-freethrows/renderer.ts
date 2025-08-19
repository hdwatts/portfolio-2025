import { type Ball, type Hoop, type Position, type GameState } from "./types";

export class Renderer {
	private ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private backgroundImage: HTMLImageElement;

	constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
		this.ctx = ctx;
		this.canvas = canvas;
		this.backgroundImage = new Image();
		this.backgroundImage.src = "/ten-freethrows/backboard.png";
	}

	clear(): void {
		// Use actual canvas dimensions
		const cw =
			this.canvas.width / Math.min(2, window.devicePixelRatio || 1);
		const ch =
			this.canvas.height / Math.min(2, window.devicePixelRatio || 1);
		this.ctx.clearRect(0, 0, cw, ch);
	}

	drawCourt(hoop: Hoop, ftLine: Position, floorY: number): void {
		// Fixed dimensions - no need for responsive canvas width/height

		// Free throw semicircle (visual) - fixed size
		this.ctx.strokeStyle = "rgba(255,255,255,.15)";
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		this.ctx.arc(
			ftLine.x,
			ftLine.y,
			100,
			Math.PI * 0.05,
			Math.PI * 0.95,
			true,
		); // Fixed radius
		this.ctx.stroke();

		this.ctx.drawImage(
			this.backgroundImage,
			hoop.board.x - 80,
			hoop.board.y + 30,
			132,
			540 - 20,
		);

		// Backboard
		// this.ctx.fillStyle = "#000";
		// this.ctx.fillRect(hoop.board.x, hoop.board.y, hoop.board.w, hoop.board.h);
		// this.ctx.strokeStyle = "#000";
		// this.ctx.lineWidth = hoop.board.w;
		// console.log("Drawing image");
		// this.ctx.drawImage(
		// 	this.pipeImage,
		// 	100,
		// 	100,
		// 	500,
		// 	400,
		// 	hoop.board.x,
		// 	hoop.board.y,
		// 	500,
		// 	this.ctx.canvas.height - hoop.board.y,
		// );
		// this.ctx.beginPath();
		// const radius = 75;
		// this.ctx.arc(
		// 	hoop.board.x + hoop.board.w,
		// 	hoop.board.y + hoop.board.h + radius / 1.5,
		// 	radius,
		// 	Math.PI * 1.5,
		// 	Math.PI * 2,
		// );
		// this.ctx.lineTo(
		// 	hoop.board.x + hoop.board.w + radius,
		// 	this.ctx.canvas.height,
		// );
		// this.ctx.stroke();

		// Net (simple) - fixed dimensions based on hoop.r = 35
		// this.ctx.strokeStyle = "rgba(255,255,255,.7)";
		// this.ctx.lineWidth = 1;
		// for (let i = 0; i < 8; i++) {
		//   const t = (i / 4 - 0.5) * 63; // Fixed: 35 * 1.8 = 63
		//   this.ctx.beginPath();
		//   this.ctx.moveTo(hoop.x + t * 0.6 - 6, hoop.y - 7);
		//   this.ctx.quadraticCurveTo(
		//     hoop.x + t * 0.4 - 6,
		//     hoop.y + 28, // Fixed: 35 * 0.8 = 28
		//     hoop.x + t * 0.2 - 3,
		//     hoop.y + 56 // Fixed: 35 * 1.6 = 56
		//   );
		//   this.ctx.stroke();
		// }

		// Rim - fixed dimensions based on hoop.r = 35
		// this.ctx.lineWidth = 6;
		// this.ctx.strokeStyle = "#ff5a00";
		// this.ctx.beginPath();
		// this.ctx.ellipse(
		//   hoop.x,
		//   hoop.y,
		//   14, // Fixed: 35 / 2.5 = 14
		//   35, // Fixed: hoop.r = 35
		//   Math.PI / 2,
		//   0,
		//   2 * Math.PI
		// );
		// this.ctx.stroke();
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
		// This method is kept for compatibility but Matter.js now renders the ball
		// Only draw trail and effects
		this.drawBallTrail(ball);
	}

	drawBallShadow(ball: Ball, floorY: number): void {
		if (!ball.shadow || ball.shadow.opacity <= 0) return;

		const shadowX = ball.shadow.x;
		const shadowY = floorY - 24; // Shadow is always on the floor
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
			// Use actual canvas dimensions
			const cw =
				this.canvas.width / Math.min(2, window.devicePixelRatio || 1);
			const ch =
				this.canvas.height / Math.min(2, window.devicePixelRatio || 1);

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
		}
	}
}
