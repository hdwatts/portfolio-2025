import * as Matter from "matter-js";

export interface GameState {
	practice: boolean;
	shotsLeft: number;
	score: number;
	streak: number;
	bestStreak: number;
	daysInARow: number;
}

export interface Position {
	x: number;
	y: number;
}

export interface Circle extends Position {
	r: number; // radius
}

export interface Rectangle extends Position {
	w: number; // width
	h: number; // height
}

export interface Hoop {
	x: number;
	y: number;
	r: number;
	left: Circle;
	right: Circle;
	board: Rectangle;
	leftBody?: Matter.Body;
	rightBody?: Matter.Body;
	boardBody?: Matter.Body;
}

export interface Ball {
	body: Matter.Body;
	r: number;
	atRest: boolean;
	shotTaken: boolean;
	scored: boolean;
	swish: boolean;
	isAboveHoop: boolean;
	trail: Position[];
	_counted?: boolean;
	_hitRim?: boolean;
	shadow?: {
		x: number;
		y: number;
		radius: number;
		opacity: number;
	};
}

export interface Input {
	down: boolean;
	sx: number; // start x
	sy: number; // start y
	cx: number; // current x
	cy: number; // current y
	dragging: boolean;
}

export interface GameElements {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	toast: HTMLElement;
}

export interface PersistedState {
	schemaVersion: number;
	date: string;
	score: number;
	daysInARow: number;
}
