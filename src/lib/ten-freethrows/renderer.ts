import { type Ball, type Hoop, type Position, type GameState } from "./types";

export class Renderer {
	private ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private backboardImage: HTMLImageElement;
	private scoreboardImage: HTMLImageElement;
	private backgroundImage: HTMLImageElement;
	private isruImage: HTMLImageElement;
	private ballMedalImage: HTMLImageElement;
	private today: Date;
	private screenshotText: string = "Generate Screenshot";

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
		this.isruImage = new Image();
		this.isruImage.src = "/ten-freethrows/isru.png";
		this.ballMedalImage = new Image();
		this.ballMedalImage.src = "/ten-freethrows/ball-medals.png";
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
		if (ball.atRest && shotsLeft > 0) {
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

	drawGameOverOverlay(
		state: GameState,
		scale: number = 1,
	): {
		buttonBounds?: { x: number; y: number; width: number; height: number };
	} {
		return this.drawGameOverOverlayInternal(state, scale, true);
	}

	saveScreenshot(
		gameState?: GameState,
		gameScale?: number,
		redrawCallback?: () => void,
	): void {
		// Step 1: Save current canvas state
		const tempCanvas = document.createElement("canvas");
		const tempCtx = tempCanvas.getContext("2d");

		if (!tempCtx) {
			console.error("Failed to get temp canvas context");
			this.screenshotText = "Error Saving";
			return;
		}

		// Copy current canvas to temporary storage
		tempCanvas.width = this.canvas.width;
		tempCanvas.height = this.canvas.height;
		tempCtx.drawImage(this.canvas, 0, 0);

		// Step 2: Re-render the main canvas WITHOUT the button
		if (gameState && gameScale && redrawCallback) {
			// Clear and redraw without button
			redrawCallback();

			// Draw game over overlay without button
			this.drawGameOverOverlayInternal(gameState, gameScale, false);
		}

		// Step 3: Create screenshot from clean canvas
		const hiddenCanvas = document.createElement("canvas");
		const hiddenCtx = hiddenCanvas.getContext("2d");

		if (!hiddenCtx) {
			console.error("Failed to get 2D context for hidden canvas");
			// Restore original canvas
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.drawImage(tempCanvas, 0, 0);
			this.screenshotText = "Error Saving";
			return;
		}

		// Set 4:5 aspect ratio dimensions
		const baseWidth = 800;
		const baseHeight = 1000; // 4:5 ratio
		hiddenCanvas.width = baseWidth;
		hiddenCanvas.height = baseHeight;

		// Calculate scaling to fit the visible canvas into the 4:5 ratio
		const dpr = window.devicePixelRatio || 1;
		const sourceWidth = this.canvas.width / dpr;
		const sourceHeight = this.canvas.height / dpr;

		// Calculate scale to fit source canvas into target canvas while maintaining aspect ratio
		const scaleX = baseWidth / sourceWidth;
		const scaleY = baseHeight / sourceHeight;
		const scale = Math.min(scaleX, scaleY);

		const scaledWidth = sourceWidth * scale;
		const scaledHeight = sourceHeight * scale;

		// Center the image in the 4:5 canvas
		const offsetX = (baseWidth - scaledWidth) / 2;
		const offsetY = (baseHeight - scaledHeight) / 2;

		// Fill background with base color
		hiddenCtx.fillStyle = "#d6c1a1";
		hiddenCtx.fillRect(0, 0, baseWidth, baseHeight);

		const isruWidth = this.isruImage.width / 4;
		const isruHeight = this.isruImage.height / 4;
		hiddenCtx.drawImage(
			this.isruImage,
			baseWidth / 2 - isruWidth / 2,
			offsetY - 10 - isruHeight,
			isruWidth,
			isruHeight,
		);

		hiddenCtx.drawImage(
			this.ballMedalImage,
			baseWidth / 2 - this.ballMedalImage.width / 2,
			offsetY + scaledHeight + 10,
			this.ballMedalImage.width,
			this.ballMedalImage.height,
		);

		// Draw the clean canvas onto the hidden canvas
		// hiddenCtx.fillStyle = "#fff";
		// hiddenCtx.fillRect(
		// 	offsetX - 5,
		// 	offsetY - 5,
		// 	scaledWidth + 10,
		// 	scaledHeight + 10,
		// );

		hiddenCtx.drawImage(
			this.canvas,
			0,
			0,
			this.canvas.width,
			this.canvas.height,
			offsetX,
			offsetY,
			scaledWidth,
			scaledHeight,
		);

		// Step 4: Restore original canvas with button
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.drawImage(tempCanvas, 0, 0);

		// Check if we're on mobile (outside the blob callback for scope)
		const isMobile =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
				navigator.userAgent,
			);

		// Step 5: Convert to blob and save
		hiddenCanvas.toBlob((blob) => {
			if (!blob) {
				console.error("Failed to create blob from canvas");
				this.screenshotText = "Error Saving";
				return;
			}

			if (isMobile) {
				// Mobile approach: try Web Share API first, then fallback
				if (navigator.share && navigator.canShare) {
					try {
						// Create a File object from the blob
						const file = new File(
							[blob],
							`ten-freethrows-${new Date().toISOString().slice(0, 10)}.png`,
							{
								type: "image/png",
							},
						);

						// Check if we can share files
						if (navigator.canShare({ files: [file] })) {
							navigator
								.share({
									title: "Ten Free Throws Screenshot",
									text: "Check out my Ten Free Throws game result!",
									files: [file],
								})
								.then(() => {
									console.log(
										"Screenshot shared successfully",
									);
									this.screenshotText = "Screenshot Saved!";
								})
								.catch((error) => {
									console.error("Share failed:", error);
									this.fallbackMobileDownload(
										blob,
										hiddenCanvas,
									);
								});
							return; // Exit early if share API worked
						}
					} catch (error) {
						console.error("Web Share API failed:", error);
					}
				}

				// Fallback for mobile devices without Web Share API or if sharing failed
				this.fallbackMobileDownload(blob, hiddenCanvas);
			} else {
				// Desktop approach: direct download
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = `ten-freethrows-${new Date().toISOString().slice(0, 10)}.png`;

				// Trigger download
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);

				// Clean up
				URL.revokeObjectURL(url);
			}
		}, "image/png");

		// Clear the hidden canvas (though it will be garbage collected anyway)
		hiddenCtx.clearRect(0, 0, baseWidth, baseHeight);
		this.screenshotText = "Screenshot Saved!";

		// Reset button text after a delay
		setTimeout(() => {
			this.screenshotText = "Generate Screenshot";
		}, 3000);
	}

	private fallbackMobileDownload(
		blob: Blob,
		canvas: HTMLCanvasElement,
	): void {
		try {
			// Try direct download first
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `ten-freethrows-${new Date().toISOString().slice(0, 10)}.png`;
			link.target = "_blank";

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			this.screenshotText = "Screenshot Downloaded!";
		} catch (error) {
			console.error("Direct mobile download failed:", error);
			this.screenshotText = "Long press image to save";

			// Final fallback: open in new window with instructions
			const dataUrl = canvas.toDataURL("image/png");
			const newWindow = window.open();
			if (newWindow) {
				newWindow.document.write(`
					<html>
						<head>
							<title>Ten Free Throws Screenshot</title>
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
						</head>
						<body style="margin:0;padding:20px;text-align:center;background:#f0f0f0;font-family:Arial,sans-serif;">
							<h3 style="color:#333;margin-bottom:20px;">Your Ten Free Throws Screenshot</h3>
							<p style="color:#666;margin-bottom:20px;">Long press the image below and select "Save Image" or "Download Image"</p>
							<img src="${dataUrl}" style="max-width:100%;height:auto;border:2px solid #333;border-radius:8px;" alt="Ten Free Throws Screenshot"/>
							<p style="color:#888;font-size:14px;margin-top:20px;">If you can't save the image, try taking a screenshot of this page instead.</p>
						</body>
					</html>
				`);
				newWindow.document.close();
			}
		}
	}

	private drawGameOverOverlayInternal(
		state: GameState,
		scale: number,
		showButton: boolean,
	): {
		buttonBounds?: { x: number; y: number; width: number; height: number };
	} {
		if (!state.practice && state.shotsLeft === 0) {
			this.ctx.save();
			// Use display dimensions instead of buffer dimensions
			const dpr = window.devicePixelRatio || 1;
			const cw = this.canvas.width / dpr;
			const ch = this.canvas.height / dpr;

			this.ctx.fillStyle = "rgba(0,0,0,.25)";
			this.ctx.fillRect(0, 0, cw, ch);
			this.ctx.fillStyle = "#fff";
			this.ctx.textAlign = "center";
			this.ctx.font = `${50 * scale}px Visitor`;
			this.ctx.fillText(`Day Over`, cw / 2, ch * 0.52);
			this.ctx.font = `${24 * scale}px Visitor`;
			this.ctx.fillText(
				`You have played ${state.daysInARow} day${state.daysInARow !== 1 ? "s" : ""} in a row.`,
				cw / 2,
				ch * 0.56,
			);

			let buttonBounds:
				| { x: number; y: number; width: number; height: number }
				| undefined;

			// Draw screenshot button only if showButton is true
			if (showButton) {
				this.ctx.font = `${18 * scale}px Visitor`;
				this.ctx.textAlign = "center";
				const screenshotTextWidth = this.ctx.measureText(
					this.screenshotText,
				).width;
				const buttonWidth = screenshotTextWidth + 40 * scale;
				const buttonHeight = 50 * scale;
				const buttonX = cw / 2 - buttonWidth / 2;
				const buttonY = ch * 0.62;

				// Button background
				this.ctx.fillStyle = "rgba(255,255,255,0.9)";
				this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

				// Button border
				this.ctx.strokeStyle = "#333";
				this.ctx.lineWidth = 2 * scale;
				this.ctx.strokeRect(
					buttonX,
					buttonY,
					buttonWidth,
					buttonHeight,
				);

				// Button text
				this.ctx.fillStyle = "#333";

				this.ctx.fillText(
					this.screenshotText,
					cw / 2,
					buttonY + buttonHeight / 2 + 6 * scale,
				);

				buttonBounds = {
					x: buttonX,
					y: buttonY,
					width: buttonWidth,
					height: buttonHeight,
				};
			}

			this.ctx.font = `${16 * scale}px ISRU Rocket Sharpie Bold`;
			this.ctx.fillStyle = "#fff";
			this.ctx.fillText(
				`Crafted by hdwatts - S/N: 2025.063.34001`,
				cw / 2,
				ch * 0.99,
			);
			this.ctx.restore();

			return { buttonBounds };
		}
		return {};
	}
}
