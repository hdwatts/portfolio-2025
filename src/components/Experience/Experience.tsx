import { useMemo } from "react";
import {
	EXPERIENCE_DATA,
	LOGOS_NUM_ROWS,
	LOGOS_ROW_HEIGHT,
	LOGOS_ROW_PADDING,
} from "./constants";
import { ExperienceRow } from "./ExperienceRow";
import { cn } from "../../lib/utils";

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
				<div className="hover:*:paused relative flex h-full w-full -rotate-x-50 -rotate-z-20 flex-col gap-6">
					<ExperienceGroup
						top={
							-1 *
							(LOGOS_ROW_HEIGHT +
								LOGOS_NUM_ROWS *
									(LOGOS_ROW_PADDING + LOGOS_ROW_HEIGHT))
						}
					/>
					<ExperienceGroup top={-LOGOS_ROW_HEIGHT} />
					<ExperienceGroup
						top={
							LOGOS_NUM_ROWS *
								(LOGOS_ROW_PADDING + LOGOS_ROW_HEIGHT) -
							LOGOS_ROW_HEIGHT
						}
					/>
				</div>
				{/* Inset gradient overlay */}
				<div className="to-background pointer-events-none absolute top-0 left-0 h-full w-full bg-linear-to-r from-transparent from-80%" />
				<div className="to-background pointer-events-none absolute h-full w-full bg-linear-to-l from-transparent from-80%" />
				<div className="to-background pointer-events-none absolute h-full w-full bg-linear-to-t from-transparent from-80%" />
				<div className="to-background pointer-events-none absolute h-full w-full bg-linear-to-b from-transparent from-80%" />
			</div>

			{/* <div className="z-10 flex justify-end gap-1 p-4 text-xs text-gray-500">
				<p>
					Want to see how I built this animation? Read the full
					breakdown in my blog post!
				</p>
			</div> */}
		</div>
	</div>
);

const ExperienceGroup = ({ top }: { top: number }) => {
	return (
		<div
			className="animate-move-up absolute flex flex-col gap-6 will-change-transform"
			style={{
				top,
				height:
					LOGOS_NUM_ROWS *
						(LOGOS_ROW_PADDING + LOGOS_ROW_HEIGHT) *
						2 +
					LOGOS_ROW_PADDING * 2,
			}}
		>
			<ExperienceRow rowIdx={0} />
			<ExperienceRow rowIdx={1} />
			<ExperienceRow rowIdx={2} />
			<ExperienceRow rowIdx={3} />
			<ExperienceRow rowIdx={4} />
			<ExperienceRow rowIdx={5} />
			<ExperienceRow rowIdx={0} />
			<ExperienceRow rowIdx={1} />
			<ExperienceRow rowIdx={2} />
			<ExperienceRow rowIdx={3} />
			<ExperienceRow rowIdx={4} />
			<ExperienceRow rowIdx={5} />
		</div>
	);
};
