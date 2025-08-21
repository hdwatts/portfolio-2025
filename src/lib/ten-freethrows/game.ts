import * as Matter from "matter-js";
import {
	type GameState,
	type Ball,
	type Hoop,
	type Position,
	type GameElements,
	type PersistedState,
} from "./types";
import { Physics } from "./physics";
import { Renderer } from "./renderer";
import { InputManager } from "./input";

const INITIAL_STATE: GameState = {
	practice: false,
	shotsLeft: 10,
	score: 0,
	streak: 0,
	bestStreak: 0,
	daysInARow: 0,
};

export class Game {
	// Fixed physics world dimensions - keep at original scale for consistency
	private PHYSICS_WIDTH = 900; // Fixed physics world width
	private PHYSICS_HEIGHT = 600; // Fixed physics world height
	private PHYSICS_FLOOR_Y = 600; // Fixed physics floor position

	// Display dimensions - change based on canvas size
	private W = 900; // Display width
	private H = 600; // Display height
	private floorY = 600; // Display floor position
	private scale = 1; // Scaling factor for visual rendering only

	private state: GameState = INITIAL_STATE;

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
	private swishSound: HTMLAudioElement;
	private dribbleSound: HTMLAudioElement;
	private rimSound: HTMLAudioElement;

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

		this.updateDimensions(); // Initialize dimensions based on current canvas size
		this.setupEventListeners();
		this.setupCollisionEvents();
		this.updateHud();
		const persistedStateString = localStorage.getItem("persistedState");

		if (persistedStateString) {
			try {
				const persistedState: PersistedState =
					JSON.parse(persistedStateString);
				if (!persistedState.schemaVersion) {
					this.clearPersistedState();
				}

				if (
					persistedState.schemaVersion === 1 &&
					persistedState.date === "2025-08-21" &&
					persistedState.daysInARow === 1
				) {
					this.state.daysInARow = 2;
					this.state.shotsLeft = 0;
					this.state.score = persistedState.score;
					this.persistState();
				} else {
					this.state.daysInARow = persistedState.daysInARow;
					if (persistedState.date >= this.getStringDate()) {
						this.state.shotsLeft = 0;
						this.state.score = persistedState.score;
					}
				}
			} catch (e) {
				this.clearPersistedState();
				this.state = INITIAL_STATE;
			}
		}

		this.swishSound = new Audio("/ten-freethrows/swish.mp3");
		this.dribbleSound = new Audio("/ten-freethrows/dribble.mp3");
		this.rimSound = new Audio("/ten-freethrows/rim-hit.mp3");
		this.rimSound.volume = 0.5;

		// Start the physics engine
		this.physics.start();
	}

	public getStringDate(): string {
		const date = new Date();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${date.getFullYear()}-${month < 10 ? "0" + month : month}-${
			day < 10 ? "0" + day : day
		}`;
	}

	public getPhysics(): Physics {
		return this.physics;
	}

	public handleResize(): void {
		this.updateDimensions();
	}

	// Convert display coordinates to physics coordinates
	private displayToPhysics(x: number, y: number): { x: number; y: number } {
		return {
			x: x / this.scale,
			y: y / this.scale,
		};
	}

	// Convert physics coordinates to display coordinates
	private physicsToDisplay(x: number, y: number): { x: number; y: number } {
		return {
			x: x * this.scale,
			y: y * this.scale,
		};
	}

	private setupEventListeners(): void {
		// Resize handling is now done via the main app
	}

	private updateDimensions(): void {
		// Calculate new dimensions based on canvas size
		const canvasWidth =
			this.elements.canvas.width / (window.devicePixelRatio || 1);
		const canvasHeight =
			this.elements.canvas.height / (window.devicePixelRatio || 1);

		// Calculate scale factor to scale UP from physics world to display
		this.scale = Math.min(
			canvasWidth / this.PHYSICS_WIDTH,
			canvasHeight / this.PHYSICS_HEIGHT,
		);

		// Update display dimensions
		this.W = canvasWidth;
		this.H = canvasHeight;
		this.floorY = canvasHeight;

		// Update input manager with new scale
		this.inputManager.setScale(this.scale);

		// Physics world stays at fixed dimensions - only resize the physics engine canvas
		this.physics.resize(this.PHYSICS_WIDTH, this.PHYSICS_HEIGHT);

		// Re-initialize game elements at fixed physics scale
		this.initializeGameElements();
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

					if (speed > 6) {
						if (this.rimSound.currentTime > 0.5) {
							this.rimSound.currentTime = 0;
						}
						this.rimSound.play();
					}

					// Add some randomness to rim collisions for realistic bounces
					// const randomSpin = (Math.random() - 0.5) * 0.1;
					// const impactSpin = speed * 0.02; // Spin based on impact speed

					// Matter.Body.setAngularVelocity(
					// 	ballBody,
					// 	ballBody.angularVelocity + randomSpin + impactSpin,
					// );

					// Slight velocity damping on rim hit for realism
					Matter.Body.setVelocity(ballBody, {
						x: velocity.x * 0.95,
						y: velocity.y * 0.95,
					});
				} else if (otherBody.label === "backboard") {
					// Track backboard hit
					this.ball._hitRim = true;
					const velocity = ballBody.velocity;

					const speed = Math.sqrt(
						velocity.x * velocity.x + velocity.y * velocity.y,
					);

					if (speed > 6) {
						this.dribbleSound.play();
					}

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
				} else if (otherBody.label === "floor") {
					const velocity = ballBody.velocity;

					const speed = Math.sqrt(
						velocity.x * velocity.x + velocity.y * velocity.y,
					);

					if (speed > 4) {
						this.dribbleSound.currentTime = 0;
						this.dribbleSound.play();
					}
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

	private initializeGameElements(): void {
		// Game element positions at original physics scale
		this.hoop.r = 40;
		this.hoop.x = 675;
		this.hoop.y = 175;

		// Rim endpoints
		const pegR = 5;
		this.hoop.left = {
			x: this.hoop.x - this.hoop.r,
			y: this.hoop.y,
			r: pegR,
		};
		this.hoop.right = {
			x: this.hoop.x + this.hoop.r - 2,
			y: this.hoop.y + 2,
			r: pegR + 4,
		};

		// Backboard
		this.hoop.board = {
			w: 25,
			h: 140,
			x: this.hoop.x + this.hoop.r + 8,
			y: this.hoop.y - 120,
		};

		// Ball
		this.ball.r = 28;

		// Free-throw line
		this.ftLine.x = 200;
		this.ftLine.y = this.PHYSICS_FLOOR_Y;

		// Create physics boundaries at fixed physics dimensions
		this.physics.createBoundaries(
			this.PHYSICS_WIDTH,
			this.PHYSICS_HEIGHT,
			this.PHYSICS_FLOOR_Y,
		);

		this.spawnBall();
		this.createHoopBodies();
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
		if (this.state.shotsLeft === 0) {
			return;
		}

		// Create new ball body - spawn above the floor at physics coordinates
		const x = this.ftLine.x;
		const y = this.PHYSICS_FLOOR_Y - this.ball.r * 2 + 3; // Fixed spawn height
		this.ball.body = this.physics.createBall(x, y, this.ball.r);
		this.ball.body.isStatic = true;
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
			y: this.PHYSICS_FLOOR_Y - this.ball.r,
			radius: this.ball.r * 0.8,
			opacity: 0.6,
		};

		// Add ball to world
		Matter.World.add(this.physics.world, this.ball.body);
	}

	private shoot(vx: number, vy: number): void {
		if (!this.ball.atRest) return;
		this.ball.body.isStatic = false;
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
		if (!this.ball._counted) {
			this.state.shotsLeft = Math.max(0, this.state.shotsLeft - 1);
			this.ball._counted = true;

			if (this.state.shotsLeft === 0) {
				this.state.daysInARow = (this.state.daysInARow ?? 0) + 1;
				this.persistState();
			}

			setTimeout(
				() => {
					this.spawnBall();
					this.createHoopBodies();
				},
				made ? 1000 : 350,
			);
		}

		if (!made) {
			this.state.streak = 0;
		}
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
	}

	private updateHud(): void {
		// No HUD elements to update - header was removed
	}

	private handleFloorCollision(): void {
		if (this.physics.checkFloorCollision(this.ball, this.PHYSICS_FLOOR_Y)) {
			this.endShot(false);
		}
	}

	private updateBallShadow(): void {
		const ballPos = this.ball.body.position;
		const ballHeight = this.PHYSICS_FLOOR_Y - ballPos.y - this.ball.r; // Distance from ball bottom to floor

		// Maximum height where shadow is visible (adjust as needed)
		const maxShadowHeight = 300;

		if (ballHeight > maxShadowHeight) {
			// Ball is too high, hide shadow
			this.ball.shadow = {
				x: ballPos.x,
				y: this.PHYSICS_FLOOR_Y - this.ball.r,
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
			y: this.PHYSICS_FLOOR_Y - this.ball.r,
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

			// Out of bounds check with fixed physics width
			if (this.physics.isOutOfBounds(this.ball, this.PHYSICS_WIDTH)) {
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

				// Score updated internally - no UI element to update

				this.swishSound.play();

				if (this.ball.swish) {
					this.setToast("Swish!");
					this.state.score += 1;
				}

				// if (this.ball.swish) this.setToast("Swish!");
				// else this.setToast("Bucket!");
			} else {
				this.ball.isAboveHoop = false;
			}

			// Prevent ball getting stuck inside rim circle area after scoring
			if (this.ball.scored && ballPos.y > this.hoop.y + this.hoop.r * 2) {
				this.endShot(true);
			}
		}
	}

	clearCanvas(): void {
		// Clear the canvas for a fresh frame
		this.renderer.clear();
	}

	drawUnderlay(): void {
		// Draw background image first
		this.renderer.drawBackground();

		// Draw elements that should appear UNDER the Matter.js physics bodies
		this.renderer.drawCourt(
			this.ball,
			this.hoop,
			this.ftLine,
			this.PHYSICS_FLOOR_Y,
			this.state.score,
			this.state.shotsLeft,
			this.scale,
		);
		this.renderer.drawBallTrail(this.ball, this.scale);
		if (this.state.shotsLeft !== 0) {
			this.renderer.drawBallShadow(
				this.ball,
				this.floorY, // Use display floor position
				this.scale,
			);
		}
	}

	drawPhysicsBodies(): void {
		// Render the Matter.js physics bodies
		this.physics.renderBodies(this.scale);
	}

	drawOverlay(): void {
		// Draw elements that should appear OVER the Matter.js physics bodies
		this.renderer.drawHoop(this.hoop, this.scale);
		this.renderer.drawAim(
			this.ball,
			this.inputManager.getInput(),
			this.scale,
		);

		// Game over overlay
		if (!this.state.practice && this.state.shotsLeft === 0) {
			this.renderer.drawGameOverOverlay(this.state, this.scale);
		}
	}
	persistState(): void {
		localStorage.setItem(
			"persistedState",
			JSON.stringify({
				schemaVersion: 2,
				date: this.getStringDate(),
				score: this.state.score,
				daysInARow: this.state.daysInARow,
			} as PersistedState),
		);
	}
	clearPersistedState(): void {
		localStorage.removeItem("persistedState");
	}
}
