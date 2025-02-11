import Autoplay from "embla-carousel-autoplay";
import throttle from "lodash/throttle";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "./Carousel";
import { useCallback, useState, type MouseEvent } from "react";
import { cn } from "../lib/utils";

const CarouselQuote = ({
	text,
	from,
	index,
}: {
	text: string;
	from: string;
	index: number;
}) => {
	const [rotate, setRotate] = useState({ x: 0, y: 0 });

	const onMouseMove = useCallback(
		throttle((e: MouseEvent<HTMLDivElement>) => {
			const card = e.currentTarget;
			if (card) {
				const box = card.getBoundingClientRect();
				const x = e.clientX - box.left;
				const y = e.clientY - box.top;
				const centerX = box.width / 2;
				const centerY = box.height / 2;
				const rotateX = (y - centerY) / 15;
				const rotateY = (centerX - x) / 15;

				setRotate({ x: rotateX, y: rotateY });
			}
		}, 100),
		[],
	);

	const onMouseLeave = () => {
		setRotate({ x: 0, y: 0 });
	};
	return (
		<CarouselItem
			className={cn("text-background flex justify-center pl-12")}
		>
			<div
				className={cn(
					"animate-card-effect m-16 h-[350px]",
					"hover:paused",
				)}
				style={{
					animationDirection: index % 2 === 0 ? "normal" : "reverse",
				}}
			>
				<div
					onMouseMove={onMouseMove}
					onMouseLeave={onMouseLeave}
					style={{
						transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
					}}
					className="relative transition-[transform_400ms_cubic-bezier(0.03,0.98,0.52,0.99)_0s]"
				>
					<div
						className={cn(
							"bg-primary background-size-[4px_4px] select-none",
							"bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#FAFAFA_5px),repeating-linear-gradient(#dadada55,#dadada)]",
							"relative z-10 flex h-[300px] flex-col outline-2 outline-[#dadada]",
							"my-4 items-center justify-center rounded-3xl px-4 py-4 text-sm md:px-12 md:text-base",
						)}
					>
						<div
							className={cn(
								"text-accent flex grow items-center font-sans",
								"text-lg lg:text-base xl:text-lg",
							)}
							style={{
								textShadow: "1px 1px 1px rgba(0,0,0,0.4)",
							}}
						>
							"{text}"
						</div>
						<div
							className="text-accent w-full text-right font-sans text-xs"
							style={{
								textShadow: "1px 1px 1px rgba(0,0,0,0.4)",
							}}
						>
							{from.toUpperCase()}
						</div>
					</div>
					<div className="absolute -inset-4 animate-pulse rounded-lg bg-gradient-to-r from-gray-600 via-slate-400 to-gray-600 opacity-85 blur-xl" />
				</div>
			</div>
		</CarouselItem>
	);
};

export const Testimonials = () => {
	const [autoPlay] = useState(() =>
		Autoplay({
			delay: 5000,
			stopOnInteraction: true,
		}),
	);

	return (
		<Carousel opts={{ loop: true }} plugins={[autoPlay]} className="w-full">
			<CarouselContent className="-ml-12 py-4">
				<CarouselQuote
					text="[Dean] has helped me develop as an engineer more than he probably realizes."
					from="Junior engineer post promotion"
					index={0}
				/>
				<CarouselQuote
					text='A strong sense of humility, which when paired with [his] incredible technical skills, is the winning combo that defines the "Dean" brand.'
					from="Former engineering manager"
					index={1}
				/>
				<CarouselQuote
					text="Dean excels in working on large projects, no matter the complexity he is on top of it and gets it done well."
					from="Senior coworker"
					index={2}
				/>
				<CarouselQuote
					text="Dean always makes time to help out with questions as they come up and lend a hand."
					from="Senior engineer"
					index={3}
				/>
				<CarouselQuote
					text="Hard to imagine anyone who's attitude is better, to be honest.
				Positive, energetic, and consistent every day."
					from="Engineering manager"
					index={4}
				/>
				<CarouselQuote
					text="Really appreciate all the help [Dean] gave but more importantly am thankful for the laughs and for making the transition into my first real job pretty seamless."
					from="Former coworker"
					index={5}
				/>
				<CarouselQuote
					text={`[Dean has] set the baseline for what it means to be a good coworker. I have found myself thinking "What would Dean do?"`}
					from="Former coworker"
					index={6}
				/>
			</CarouselContent>
			<CarouselPrevious
				autoPlay={autoPlay}
				className="text-primary hidden lg:flex"
			/>
			<CarouselNext
				autoPlay={autoPlay}
				className="text-primary hidden lg:flex"
			/>
		</Carousel>
	);
};
