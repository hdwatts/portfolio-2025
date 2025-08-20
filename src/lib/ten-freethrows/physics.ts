import * as Matter from "matter-js";
import { type Ball } from "./types";

export class Physics {
	public engine: Matter.Engine;
	public world: Matter.World;
	public runner: Matter.Runner;
	public render: Matter.Render;
	private floorBody: Matter.Body | null = null;
	private leftWallBody: Matter.Body | null = null;
	private rightWallBody: Matter.Body | null = null;
	private ceilingBody: Matter.Body | null = null;
	private basketballImage: HTMLImageElement;

	constructor(canvas: HTMLCanvasElement) {
		// Create engine
		this.engine = Matter.Engine.create();
		this.world = this.engine.world;

		// Create runner for consistent physics timing
		this.runner = Matter.Runner.create();

		// Create renderer with fixed dimensions (will be set properly in resize)
		this.render = Matter.Render.create({
			canvas: canvas,
			engine: this.engine,
			options: {
				width: 800, // Will be updated in resize
				height: 600, // Will be updated in resize
				pixelRatio: 1,
				background: "transparent",
				wireframes: false,
				showVelocity: false,
				showAngleIndicator: false,
				showDebug: false,
			},
		});

		// We'll use custom rendering instead of Matter.js renderer to avoid canvas clearing

		// Load basketball sprite
		this.basketballImage = new Image();
		this.basketballImage.src = "/ten-freethrows/basketball.png";

		// Realistic basketball gravity - stronger for less floaty feel
		this.engine.world.gravity.y = 1.8; // Increased gravity for realistic basketball physics
		this.engine.world.gravity.x = 0;

		// Set appropriate scale for pixel-based physics
		this.engine.world.gravity.scale = 0.001;
	}

	createBoundaries(
		canvasWidth: number,
		canvasHeight: number,
		floorY: number,
	): void {
		// Remove existing boundaries
		if (this.floorBody) Matter.World.remove(this.world, this.floorBody);
		if (this.leftWallBody)
			Matter.World.remove(this.world, this.leftWallBody);
		if (this.rightWallBody)
			Matter.World.remove(this.world, this.rightWallBody);
		if (this.ceilingBody) Matter.World.remove(this.world, this.ceilingBody);

		// Create floor - position it so the top surface is at floorY
		this.floorBody = Matter.Bodies.rectangle(
			canvasWidth / 2,
			floorY, // Offset by half the thickness so top surface is at floorY
			canvasWidth,
			50,
			{
				isStatic: true,
				restitution: 0.65, // Slightly higher for realistic basketball court bounce
				friction: 0.9, // High friction for realistic ball stopping
				frictionStatic: 0.95, // High static friction
				label: "floor",
				render: {
					visible: false,
					fillStyle: "#0a101e",
					strokeStyle: "transparent",
				},
			},
		);

		// Create invisible walls for out-of-bounds detection
		this.leftWallBody = Matter.Bodies.rectangle(
			-50,
			canvasHeight / 2,
			50,
			canvasHeight * 2,
			{
				isStatic: true,
				isSensor: true,
				label: "leftWall",
				render: {
					visible: false,
				},
			},
		);

		this.rightWallBody = Matter.Bodies.rectangle(
			canvasWidth + 50,
			canvasHeight / 2,
			50,
			canvasHeight * 2,
			{
				isStatic: true,
				isSensor: true,
				label: "rightWall",
				render: {
					visible: false,
				},
			},
		);

		this.ceilingBody = Matter.Bodies.rectangle(
			canvasWidth / 2,
			-200,
			canvasWidth,
			50,
			{
				isStatic: true,
				isSensor: true,
				label: "ceiling",
				render: {
					visible: false,
				},
			},
		);

		Matter.World.add(this.world, [
			this.floorBody,
			this.leftWallBody,
			this.rightWallBody,
			this.ceilingBody,
		]);
	}

	createBall(x: number, y: number, radius: number): Matter.Body {
		console.log(radius);
		return Matter.Bodies.circle(x, y, radius, {
			restitution: 0.75, // Higher bounce for realistic basketball
			density: 0.6, // Realistic basketball density (lighter than default)
			friction: 0.7, // Surface friction for realistic rolling
			frictionAir: 0.008, // Increased air resistance for less floaty feel
			frictionStatic: 0.8, // Static friction when ball comes to rest
			label: "ball",
			render: {
				sprite: {
					texture: "/ten-freethrows/basketball.png",
					xScale: 1,
					yScale: 1,
				},
				fillStyle: "#ff8a00",
				strokeStyle: "transparent",
				visible: true,
			},
		});
	}

	createRimPeg(x: number, y: number, radius: number): Matter.Body {
		return Matter.Bodies.circle(x, y, radius, {
			isStatic: true,
			restitution: 0.85, // Slightly higher for realistic rim bounce
			friction: 0.4, // More friction for realistic ball-rim interaction
			frictionStatic: 0.5,
			label: "rim",
			render: {
				visible: false,
			},
		});
	}

	createBackboard(
		x: number,
		y: number,
		width: number,
		height: number,
	): Matter.Body {
		return Matter.Bodies.rectangle(
			x + width / 2,
			y + height / 2 + 20,
			width - 15,
			height - 20,
			{
				isStatic: true,
				restitution: 0.7, // Higher for realistic glass backboard bounce
				friction: 0.2, // Slightly more friction for realistic interaction
				frictionStatic: 0.3,
				label: "backboard",
				render: {
					visible: false,
				},
			},
		);
	}

	updateBall(ball: Ball, dt: number): void {
		if (ball.atRest) return;

		// Apply realistic angular velocity based on linear velocity for spinning effect
		const velocity = ball.body.velocity;
		const speed = Math.sqrt(
			velocity.x * velocity.x + velocity.y * velocity.y,
		);

		// Natural rotation based on movement - basketballs spin as they move
		// if (speed > 0.5) {
		//   // Calculate natural spin based on horizontal movement
		//   const naturalSpin = velocity.x / (ball.r * 2); // Realistic spin rate
		//   const currentSpin = ball.body.angularVelocity;

		//   // Gradually adjust spin towards natural spin (simulates air resistance effect on rotation)
		//   const spinDamping = 0.999; // Reduced damping for more natural rotation
		//   const targetSpin = naturalSpin * 0.99; // Less resistance to natural rolling
		//   const newSpin =
		//     currentSpin * spinDamping + (targetSpin - currentSpin) * 0.005;

		//   Matter.Body.setAngularVelocity(ball.body, newSpin);
		// } else {
		//   // Slow down rotation when ball is moving slowly (less aggressive)
		//   Matter.Body.setAngularVelocity(
		//     ball.body,
		//     ball.body.angularVelocity * 0.98
		//   );
		// }

		// Update trail
		ball.trail.push({ x: ball.body.position.x, y: ball.body.position.y });
		if (ball.trail.length > 18) ball.trail.shift();
	}

	start(): void {
		// Don't start the automatic renderer - we'll handle rendering manually
		// Matter.Render.run(this.render);

		// Start the runner
		Matter.Runner.run(this.runner, this.engine);
	}

	renderBodies(scale: number = 1): void {
		// Custom render bodies without clearing canvas
		const ctx = this.render.canvas.getContext("2d");
		if (!ctx) return;

		const bodies = Matter.Composite.allBodies(this.engine.world);

		ctx.save();

		for (const body of bodies) {
			// Skip rendering invisible bodies or bodies we don't want to render
			if (!body.render.visible) continue;

			const position = body.position;
			const angle = body.angle;

			ctx.save();
			ctx.translate(position.x * scale, position.y * scale);
			ctx.rotate(angle);

			// Render based on body type/label
			if (body.label === "ball") {
				this.renderBall(ctx, body, scale);
			} else if (body.label === "rim") {
				this.renderRim(ctx, body, scale);
			}
			// Skip rendering floor, walls, ceiling as they're invisible boundaries

			ctx.restore();
		}

		ctx.restore();
	}

	private renderBall(
		ctx: CanvasRenderingContext2D,
		body: Matter.Body,
		scale: number = 1,
	): void {
		const radius = (body.circleRadius || 28) * scale;
		const diameter = radius * 2;

		// Draw basketball sprite if loaded, otherwise fallback to custom drawing
		if (
			this.basketballImage.complete &&
			this.basketballImage.naturalWidth > 0
		) {
			// Draw the basketball sprite centered and rotated
			ctx.drawImage(
				this.basketballImage,
				-radius, // x offset to center
				-radius, // y offset to center
				diameter, // width
				diameter, // height
			);
		} else {
			// Fallback: Basketball appearance
			ctx.fillStyle = "#D2691E"; // Basketball orange
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, Math.PI * 2);
			ctx.fill();

			// Basketball lines
			ctx.strokeStyle = "#8B4513"; // Dark brown
			ctx.lineWidth = 2;

			// Vertical line
			ctx.beginPath();
			ctx.moveTo(0, -radius);
			ctx.lineTo(0, radius);
			ctx.stroke();

			// Horizontal line
			ctx.beginPath();
			ctx.moveTo(-radius, 0);
			ctx.lineTo(radius, 0);
			ctx.stroke();

			// Curved lines
			ctx.beginPath();
			ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
			ctx.stroke();
		}
	}

	private renderRim(
		ctx: CanvasRenderingContext2D,
		body: Matter.Body,
		scale: number = 1,
	): void {
		const radius = body.circleRadius || 5;

		// Rim appearance - metallic orange/red
		ctx.fillStyle = "#FF4500";
		ctx.strokeStyle = "#CC3300";
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}

	private renderBackboard(
		ctx: CanvasRenderingContext2D,
		body: Matter.Body,
	): void {
		// Get the body's bounds for rectangle dimensions
		const bounds = body.bounds;
		const width = bounds.max.x - bounds.min.x;
		const height = bounds.max.y - bounds.min.y;

		// Backboard appearance - transparent since we have a background image
		ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
		ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
		ctx.lineWidth = 2;

		ctx.fillRect(-width / 2, -height / 2, width, height);
		ctx.strokeRect(-width / 2, -height / 2, width, height);
	}

	stop(): void {
		// Stop the runner
		Matter.Runner.stop(this.runner);

		// Stop the renderer
		Matter.Render.stop(this.render);
	}

	resize(width: number, height: number): void {
		// Update render options for fixed dimensions
		this.render.options.width = width;
		this.render.options.height = height;
	}

	isOutOfBounds(ball: Ball, canvasWidth: number): boolean {
		const pos = ball.body.position;
		return (
			pos.x - ball.r < -100 ||
			pos.x + ball.r > canvasWidth + 100 ||
			pos.y + ball.r < -200
		);
	}

	checkFloorCollision(ball: Ball, floorY: number): boolean {
		const pos = ball.body.position;
		const velocity = ball.body.velocity;
		if (pos.y + ball.r * 2 >= floorY - 2) {
			// Check if ball should come to rest with more realistic thresholds
			const totalSpeed = Math.abs(velocity.x) + Math.abs(velocity.y);
			const rotationSpeed = Math.abs(ball.body.angularVelocity);

			if (totalSpeed < 1.2 && rotationSpeed < 0.3 && ball.shotTaken) {
				// Gradually slow down instead of instant stop for more realism
				Matter.Body.setVelocity(ball.body, {
					x: velocity.x * 0.8,
					y: Math.min(velocity.y * 0.6, 0),
				});
				Matter.Body.setAngularVelocity(
					ball.body,
					ball.body.angularVelocity * 0.7,
				);

				// If very slow, stop completely
				if (totalSpeed < 0.3) {
					Matter.Body.setVelocity(ball.body, { x: 0, y: 0 });
					Matter.Body.setAngularVelocity(ball.body, 0);
					return true; // Signal end of shot
				}
			}
		}
		return false;
	}
}
