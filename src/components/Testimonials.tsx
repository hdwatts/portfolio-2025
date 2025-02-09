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

const CarouselQuote = ({ text, from }: { text: string; from: string }) => (
	<CarouselItem className="flex justify-center">
		<div className="relative flex w-[500px] justify-center p-12 italic">
			<Quote className="absolute top-0 left-0 transform-[scale(-1,1)]" />
			{text}
			<div className="absolute bottom-1 text-xs">~ {from}</div>
			<Quote className="absolute right-0 bottom-0" />
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
		<Carousel
			className="outline-secondary rounded-3xl p-8 outline"
			opts={{ loop: true }}
			plugins={[autoPlay]}
		>
			<CarouselContent>
				<CarouselQuote
					text="[Dean] has helped me develop as an engineer more than he probably realizes."
					from="Junior engineer after being promoted to senior"
				/>
				<CarouselQuote
					text='A strong sense of humility, which when paired with [his] incredible technical skills, is the winning combo that defines the "Dean" brand.'
					from="Former engineering manager"
				/>
				<CarouselQuote
					text="Dean excels in working on large projects, no matter the
				complexity he is on top of it and getting it done well."
					from="Senior coworker"
				/>
				<CarouselQuote
					text="Dean always makes time to help out with questions as they come up and lend a hand."
					from="Senior engineer"
				/>
				<CarouselQuote
					text="Hard to imagine anyone who's attitude is better, to be honest.
				Positive, energetic, and consistent every day."
					from="Engineering manager"
				/>
				<CarouselQuote
					text="Really appreciate all the help [Dean] gave but more importantly am thankful for the laughs and for making the transition into my first real job pretty seamless."
					from="Former coworker"
				/>
				<CarouselQuote
					text="[He has] technical abilities that seem to know no bounds."
					from="Senior engineer"
				/>
				<CarouselQuote
					text={`[Dean has] set the baseline for what it means to be a good coworker. I have found myself saying "What would Dean do?"`}
					from="Former coworker"
				/>
			</CarouselContent>
			<CarouselPrevious autoPlay={autoPlay} />
			<CarouselNext autoPlay={autoPlay} />
		</Carousel>
	);
};
