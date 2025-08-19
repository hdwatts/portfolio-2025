import * as Matter from "matter-js";
import {
	type GameState,
	type Ball,
	type Hoop,
	type Position,
	type GameElements,
} from "./types";
import { Physics } from "./physics";
import { Renderer } from "./renderer";
import { InputManager } from "./input";

export class Game {
	private DPR = Math.min(2, window.devicePixelRatio || 1);
	// Dynamic width and height for full screen
	private W = 0; // Will be set to actual canvas width
	private H = 0; // Will be set to actual canvas height
	private floorY = 0; // Will be calculated based on actual height

	private state: GameState = {
		practice: false,
		shotsLeft: 10,
		score: 0,
		streak: 0,
		bestStreak: 0,
	};

	private hoop: Hoop = {
		x: 0,
		y: 0,
		r: 0,
		left: { x: 0, y: 0, r: 0 },
		right: { x: 0, y: 0, r: 0 },
		board: { x: 0, y: 0, w: 0, h: 0 },
	};

	private ftLine: Position = { x: 0, y: 0 };

	private ball: Ball = {
		body: {} as Matter.Body, // Will be initialized properly in constructor
		r: 0,
		atRest: true,
		shotTaken: false,
		scored: false,
		swish: false,
		isAboveHoop: false,
		trail: [],
	};

	private elements: GameElements;
	private physics: Physics;
	private renderer: Renderer;
	private inputManager: InputManager;

	constructor(elements: GameElements) {
		this.elements = elements;
		this.physics = new Physics(elements.canvas);
		this.renderer = new Renderer(elements.ctx, elements.canvas);
		this.inputManager = new InputManager(
			elements.canvas,
			this.shoot.bind(this),
			this.restartRound.bind(this),
			this.togglePractice.bind(this),
		);

		this.setupEventListeners();
		this.setupCollisionEvents();
		this.initializeFixedLayout();
		this.updateHud();

		// Start the physics engine
		this.physics.start();
	}

	public getPhysics(): Physics {
		return this.physics;
	}

	private setupEventListeners(): void {
		// Add resize listener to handle full-width canvas
		window.addEventListener("resize", () => this.handleResize());
		this.elements.resetBtn.addEventListener("click", () =>
			this.restartRound(),
		);
	}

	private setupCollisionEvents(): void {
		Matter.Events.on(this.physics.engine, "collisionActive", (event) => {
			const pairs = event.pairs;

			for (const pair of pairs) {
				const { bodyA, bodyB } = pair;
				const ballBody =
					bodyA.label === "ball"
						? bodyA
						: bodyB.label === "ball"
							? bodyB
							: null;
				const otherBody = ballBody === bodyA ? bodyB : bodyA;

				if (!ballBody) continue;

				if (otherBody.label === "floor") {
					// Handle floor collision
					this.handleFloorCollision();
				}
			}
		});
		Matter.Events.on(this.physics.engine, "collisionStart", (event) => {
			const pairs = event.pairs;

			for (const pair of pairs) {
				const { bodyA, bodyB } = pair;
				const ballBody =
					bodyA.label === "ball"
						? bodyA
						: bodyB.label === "ball"
							? bodyB
							: null;
				const otherBody = ballBody === bodyA ? bodyB : bodyA;

				if (!ballBody) continue;

				if (otherBody.label === "rim") {
					// Track rim hit for swish detection
					this.ball._hitRim = true;

					// Add realistic rim collision effects
					const velocity = ballBody.velocity;
					const speed = Math.sqrt(
						velocity.x * velocity.x + velocity.y * velocity.y,
					);

					// Add some randomness to rim collisions for realistic bounces
					const randomSpin = (Math.random() - 0.5) * 0.1;
					const impactSpin = speed * 0.02; // Spin based on impact speed

					Matter.Body.setAngularVelocity(
						ballBody,
						ballBody.angularVelocity + randomSpin + impactSpin,
					);

					// Slight velocity damping on rim hit for realism
					Matter.Body.setVelocity(ballBody, {
						x: velocity.x * 0.95,
						y: velocity.y * 0.95,
					});
				} else if (otherBody.label === "backboard") {
					// Track backboard hit
					this.ball._hitRim = true;
					const velocity = ballBody.velocity;

					// More realistic backboard interaction
					Matter.Body.setVelocity(ballBody, {
						x: velocity.x * 0.92, // More energy loss on backboard
						y: velocity.y * 0.96,
					});

					// Reverse some spin on backboard hit
					Matter.Body.setAngularVelocity(
						ballBody,
						ballBody.angularVelocity * 0.8,
					);
				} else if (
					otherBody.label === "leftWall" ||
					otherBody.label === "rightWall" ||
					otherBody.label === "ceiling"
				) {
					// Out of bounds
					this.endShot(false);
				}
			}
		});
	}

	private initializeFixedLayout(): void {
		// Get actual canvas dimensions
		const rect = this.elements.canvas.getBoundingClientRect();
		this.W = rect.width;
		this.H = rect.height;
		this.floorY = this.H; // Floor position based on actual height

		// Set canvas to actual dimensions
		this.elements.canvas.width = this.W * this.DPR;
		this.elements.canvas.height = this.H * this.DPR;

		// Update physics renderer size
		this.physics.resize(this.W, this.H);

		// Center the game elements on screen
		const centerX = this.W / 2;
		const gameWidth = 375; // Original game width for positioning reference
		const gameOffsetX = gameWidth / 2; // Half of original game width

		const hoopHeight = 450;

		// Fixed hoop position and size (centered both horizontally and vertically)
		this.hoop.r = 35; // Fixed rim radius
		this.hoop.x = centerX + gameOffsetX - 20 - 130; // Center + offset - margin - hoop offset
		this.hoop.y = this.H - hoopHeight; // Center - offset + original position

		// Fixed rim endpoints as small colliders
		const pegR = 4; // Fixed peg radius
		this.hoop.left = {
			x: this.hoop.x - this.hoop.r,
			y: this.hoop.y,
			r: pegR,
		};
		this.hoop.right = {
			x: this.hoop.x + this.hoop.r,
			y: this.hoop.y,
			r: pegR,
		};

		// Fixed backboard dimensions
		this.hoop.board.w = 20; // Fixed width
		this.hoop.board.h = 120; // Fixed height
		this.hoop.board.x = this.hoop.x + this.hoop.r + 5; // Fixed position behind rim
		this.hoop.board.y = this.hoop.y - this.hoop.board.h + 10; // Fixed vertical position

		// Fixed ball radius
		this.ball.r = 24; // Fixed ball size

		// Fixed free-throw line & ball spawn position (centered both ways)
		this.ftLine.x = centerX - gameOffsetX + this.ball.r; // Center - offset + original position
		this.ftLine.y = this.H - this.ball.r * 2; // Center + offset - margin - adjustment

		// Create physics boundaries with full dimensions
		this.physics.createBoundaries(this.W, this.H, this.floorY);

		this.spawnBall();

		// Remove existing hoop bodies and create new ones
		this.createHoopBodies();
	}

	private handleResize(): void {
		// Only update if ball is at rest to avoid disrupting gameplay
		if (this.ball.atRest) {
			this.initializeFixedLayout();
		}
	}

	private createHoopBodies(): void {
		// Remove existing hoop bodies if they exist
		if (this.hoop.leftBody)
			Matter.World.remove(this.physics.world, this.hoop.leftBody);
		if (this.hoop.rightBody)
			Matter.World.remove(this.physics.world, this.hoop.rightBody);
		if (this.hoop.boardBody)
			Matter.World.remove(this.physics.world, this.hoop.boardBody);

		// Create new hoop bodies

		this.hoop.leftBody = this.physics.createRimPeg(
			this.hoop.left.x,
			this.hoop.left.y,
			this.hoop.left.r,
		);
		this.hoop.rightBody = this.physics.createRimPeg(
			this.hoop.right.x,
			this.hoop.right.y,
			this.hoop.right.r,
		);
		this.hoop.boardBody = this.physics.createBackboard(
			this.hoop.board.x,
			this.hoop.board.y,
			this.hoop.board.w,
			this.hoop.board.h,
		);

		Matter.World.add(this.physics.world, [
			this.hoop.leftBody,
			this.hoop.rightBody,
			this.hoop.boardBody,
		]);
	}

	private spawnBall(): void {
		// Remove existing ball body if it exists
		if (this.ball.body && this.ball.body.id) {
			Matter.World.remove(this.physics.world, this.ball.body);
		}

		// Create new ball body
		const x = this.ftLine.x;
		const y = this.ftLine.y - this.ball.r - 1;
		this.ball.body = this.physics.createBall(x, y, this.ball.r);

		// Reset ball state
		this.ball.atRest = true;
		this.ball.shotTaken = false;
		this.ball.scored = false;
		this.ball.swish = false;
		this.ball.isAboveHoop = false;
		this.ball.trail.length = 0;
		this.ball._hitRim = false;

		// Initialize shadow
		this.ball.shadow = {
			x: x,
			y: this.floorY,
			radius: this.ball.r * 0.8,
			opacity: 0.6,
		};

		// Add ball to world
		Matter.World.add(this.physics.world, this.ball.body);
	}

	private shoot(vx: number, vy: number): void {
		if (!this.ball.atRest) return;

		// Apply velocity to the Matter.js body
		Matter.Body.setVelocity(this.ball.body, { x: vx, y: vy });

		// Apply realistic initial angular velocity - basketballs naturally spin backwards
		const speed = Math.sqrt(vx * vx + vy * vy);
		const backspinFactor = -0.02; // Negative for backspin
		const angularVel = (vx / this.ball.r) * 0.8 + speed * backspinFactor;
		Matter.Body.setAngularVelocity(this.ball.body, angularVel);

		this.ball.atRest = false;
		this.ball.shotTaken = true;
		this.ball._counted = false;
		this.ball.swish = false;
		this.ball.isAboveHoop = false;
	}

	private endShot(made: boolean): void {
		if (!this.state.practice) {
			if (!this.ball._counted) {
				this.state.shotsLeft = Math.max(0, this.state.shotsLeft - 1);
				this.elements.shotsEl.textContent =
					this.state.shotsLeft.toString();
				this.ball._counted = true;
			}
			if (this.state.shotsLeft === 0) {
				setTimeout(() => {
					this.setToast(
						`Round Over — Score ${this.state.score}/10 · Best Streak ${this.state.bestStreak}`,
					);
				}, 80);
			}
		}
		if (!made) {
			this.state.streak = 0;
		}
		// Respawn after short delay
		setTimeout(() => {
			this.spawnBall();
			this.createHoopBodies();
		}, 350);
	}

	private setToast(msg: string): void {
		this.elements.toast.textContent = msg;
		this.elements.toast.classList.add("show");
		clearTimeout((this.setToast as any)._t);
		(this.setToast as any)._t = setTimeout(() => {
			this.elements.toast.classList.remove("show");
		}, 1200);
	}

	private restartRound(): void {
		this.state.score = 0;
		this.state.streak = 0;
		this.state.bestStreak = 0;
		this.state.shotsLeft = 10;
		this.updateHud();
		this.spawnBall();
		this.createHoopBodies();
		this.setToast("New Round");
	}

	private togglePractice(): void {
		this.state.practice = !this.state.practice;
		if (this.state.practice) {
			this.setToast("Practice Mode On — Endless");
		} else {
			this.setToast("Practice Mode Off");
		}
		this.updateHud();
	}

	private updateHud(): void {
		this.elements.scoreEl.textContent = this.state.score.toString();
		this.elements.shotsEl.textContent = this.state.shotsLeft.toString();
	}

	private handleFloorCollision(): void {
		if (this.physics.checkFloorCollision(this.ball, this.floorY)) {
			this.endShot(false);
		}
	}

	private updateBallShadow(): void {
		const ballPos = this.ball.body.position;
		const ballHeight = this.floorY - ballPos.y - this.ball.r; // Distance from ball bottom to floor

		// Maximum height where shadow is visible (adjust as needed)
		const maxShadowHeight = 300;

		if (ballHeight > maxShadowHeight) {
			// Ball is too high, hide shadow
			this.ball.shadow = {
				x: ballPos.x,
				y: this.floorY,
				radius: 0,
				opacity: 0,
			};
			return;
		}

		// Calculate shadow properties based on height
		const heightRatio = Math.max(0, ballHeight / maxShadowHeight);
		const baseRadius = this.ball.r * 0.8; // Base shadow size when ball is on ground
		const maxRadius = this.ball.r * 1.5; // Maximum shadow size when ball is high

		// Shadow gets larger and fainter as ball gets higher
		const shadowRadius =
			baseRadius + (maxRadius - baseRadius) * heightRatio;
		const maxOpacity = 0.6;
		const minOpacity = 0.1;
		const shadowOpacity =
			maxOpacity - (maxOpacity - minOpacity) * heightRatio;

		this.ball.shadow = {
			x: ballPos.x,
			y: this.floorY,
			radius: shadowRadius,
			opacity: shadowOpacity,
		};
	}

	update(dt: number): void {
		// Update input dragging state
		this.inputManager.updateDragging(this.ball, this.state);

		// Update ball shadow based on position and height
		this.updateBallShadow();

		if (!this.ball.atRest) {
			// Update ball trail (physics updates are handled by Matter.js)
			this.physics.updateBall(this.ball, dt);

			// Out of bounds check with fixed width
			if (this.physics.isOutOfBounds(this.ball, this.W)) {
				this.endShot(false);
				return;
			}

			// Scoring detection
			const ballPos = this.ball.body.position;
			const between =
				ballPos.x > this.hoop.left.x && ballPos.x < this.hoop.right.x;

			if (between && ballPos.y < this.hoop.y) {
				this.ball.isAboveHoop = true;
			} else if (
				between &&
				!this.ball.scored &&
				this.ball.shotTaken &&
				this.ball.isAboveHoop &&
				ballPos.y > this.hoop.y
			) {
				this.ball.isAboveHoop = false;
				this.ball.scored = true;
				this.state.score += 1;
				this.state.streak += 1;
				this.state.bestStreak = Math.max(
					this.state.bestStreak,
					this.state.streak,
				);

				// Check if it was a swish (no rim collision detected)
				this.ball.swish = !this.ball._hitRim;

				this.elements.scoreEl.textContent = this.state.score.toString();

				if (this.ball.swish) this.setToast("Swish! ✨");
				else this.setToast("Bucket! ✅");
			} else {
				this.ball.isAboveHoop = false;
			}

			// Prevent ball getting stuck inside rim circle area after scoring
			if (this.ball.scored && ballPos.y > this.hoop.y + this.hoop.r * 2) {
				this.endShot(true);
			}
		}
	}

	drawOverlay(): void {
		// Use existing overlay canvas or create one
		let overlayCanvas = document.querySelector(
			"#game-overlay",
		) as HTMLCanvasElement;

		if (!overlayCanvas) {
			overlayCanvas = document.createElement("canvas");
			overlayCanvas.id = "game-overlay";
			overlayCanvas.style.pointerEvents = "none";
			overlayCanvas.style.zIndex = "-1";
			this.elements.canvas.parentElement!.appendChild(overlayCanvas);
		}

		const overlayCtx = overlayCanvas.getContext("2d")!;

		// Use actual canvas size
		overlayCanvas.width = this.W * this.DPR;
		overlayCanvas.height = this.H * this.DPR;
		overlayCanvas.style.width = this.W + "px";
		overlayCanvas.style.height = this.H + "px";

		overlayCtx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
		overlayCtx.clearRect(0, 0, this.W, this.H);

		// Create a temporary renderer for the overlay

		// Draw UI elements that Matter.js doesn't handle
		this.renderer.drawCourt(this.hoop, this.ftLine, this.floorY);
		this.renderer.drawBallShadow(this.ball, this.floorY);
		this.renderer.drawAim(this.ball, this.inputManager.getInput());
		this.renderer.drawBallTrail(this.ball);

		// Game over overlay
		if (
			!this.state.practice &&
			this.state.shotsLeft === 0 &&
			this.ball.atRest
		) {
			this.renderer.drawGameOverOverlay(this.state);
		}
	}
}
