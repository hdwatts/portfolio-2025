import { useMemo } from "react";
import {
	EXPERIENCE_DATA,
	LOGOS_NUM_ROWS,
	LOGOS_ROW_HEIGHT,
	LOGOS_ROW_PADDING,
} from "./constants";
import { ExperienceRow } from "./ExperienceRow";
import { Link } from "../Link";

export const Experience = () => (
	<div className="relative flex w-full max-w-[1200px] flex-col justify-between lg:flex-row">
		<div className="z-10 flex min-w-sm flex-col gap-6 p-8 lg:max-w-lg lg:p-16">
			<h2 className="text-3xl font-bold">Technical Experience</h2>
			<p>
				With over a decade of professional experience as a software
				engineer, I've had the opportunity to work with a wide range of
				cutting-edge technologies.
			</p>
			<p>
				I'm passionate about continuously learning and applying new
				technologies to build innovative solutions. Here's a selection
				of tools I've worked with throughout my career.
			</p>
		</div>
		<div className="relative flex grow flex-col overflow-hidden">
			<div
				className="flex h-[500px] w-[95vw] overflow-hidden lg:w-full"
				style={{
					backgroundColor: "hsl(0 0% 14.9%)",
				}}
			>
				<div className="group/container relative flex h-full w-full -rotate-x-50 -rotate-z-20 flex-col gap-6">
					<div
						className="group-hover/container:paused animate-move-up absolute flex flex-col justify-end gap-6 will-change-transform"
						style={{
							top: -LOGOS_ROW_HEIGHT - LOGOS_ROW_PADDING,
						}}
					>
						<ExperienceRow rowIdx={0} />
						<ExperienceRow rowIdx={1} />
						<ExperienceRow rowIdx={2} />
						<ExperienceRow rowIdx={3} />
						<ExperienceRow rowIdx={4} />
						<ExperienceRow rowIdx={5} />
						<ExperienceRow rowIdx={6} />
						<ExperienceRow rowIdx={7} />
						<ExperienceRow rowIdx={8} />
						<ExperienceRow rowIdx={9} />
						<ExperienceRow rowIdx={10} />
						<ExperienceRow rowIdx={11} />
						<ExperienceRow rowIdx={12} />
						<ExperienceRow rowIdx={13} />
					</div>
				</div>
				{/* Inset gradient overlay */}
				<div className="to-background pointer-events-none absolute top-0 left-0 h-full w-full bg-linear-to-r from-transparent from-80%" />
				<div className="to-background pointer-events-none absolute h-full w-full bg-linear-to-l from-transparent from-80%" />
				<div className="to-background pointer-events-none absolute h-full w-full bg-linear-to-t from-transparent from-80%" />
				<div className="to-background pointer-events-none absolute bottom-10 h-full w-full bg-linear-to-b from-transparent from-80%" />
			</div>

			<div className="z-10 flex justify-end gap-1 p-4 text-xs text-gray-400">
				<p>
					Curious how I built this animation? Read the full breakdown
					in{" "}
					<Link
						href="/blog/enhancing-portfolio-animated-scroll"
						className="hover:text-primary text-gray-400 opacity-100 transition-colors"
					>
						this blog post
					</Link>
					!
				</p>
			</div>
		</div>
	</div>
);
