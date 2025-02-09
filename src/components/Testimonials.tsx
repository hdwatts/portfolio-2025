import Autoplay from "embla-carousel-autoplay";
import { Quote } from "lucide-react";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "./Carousel";
import { useState } from "react";
import { cn } from "../lib/utils";

const CarouselQuote = ({
	text,
	from,
	index,
}: {
	text: string;
	from: string;
	index: number;
}) => (
	<CarouselItem className="text-background flex justify-center pl-4">
		<div
			className="animate-card-effect relative"
			style={{
				animationDelay: `${0.33 * index}s`,
			}}
		>
			<div
				className={cn(
					"bg-primary background-size-[4px_4px]",
					"bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#FAFAFA_5px),repeating-linear-gradient(#dadada55,#dadada)]",
					"relative z-10 flex h-[300px] flex-col outline-2 outline-gray-700",
					"my-4 items-center justify-center rounded-3xl p-12 text-sm md:text-base",
				)}
			>
				<div className="font-sans sm:text-lg">"{text}"</div>
				<div className="text-accent absolute right-12 bottom-4 text-right font-sans text-xs">
					{from.toUpperCase()}
				</div>
			</div>
			<div className="absolute top-0 left-0 z-0 my-4 h-[305px] w-[calc(100%+5px)] rounded-4xl bg-gray-700" />
		</div>
	</CarouselItem>
);

export const Testimonials = () => {
	const [autoPlay] = useState(() =>
		Autoplay({
			delay: 5000,
			stopOnInteraction: true,
		}),
	);

	return (
		<Carousel opts={{ loop: true }} plugins={[autoPlay]}>
			<CarouselContent className="-ml-4 py-4">
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
			<CarouselPrevious autoPlay={autoPlay} className="text-primary" />
			<CarouselNext autoPlay={autoPlay} className="text-primary" />
		</Carousel>
	);
};
