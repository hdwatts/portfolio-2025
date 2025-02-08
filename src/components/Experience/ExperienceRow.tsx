import { useMemo } from "react";
import { EXPERIENCE_DATA } from "./constants";
import { LogoButton } from "./LogoButton";

export const ExperienceRow = ({ rowIdx }: { rowIdx: number }) => {
	const logos = useMemo(() => {
		const data = [];
		for (let a = 0; a < 5; a++) {
			data.push(
				EXPERIENCE_DATA[(rowIdx * 3 + a) % EXPERIENCE_DATA.length],
			);
		}
		return data;
	}, [rowIdx]);
	return (
		<div className="flex gap-6 odd:-translate-x-64 even:-translate-x-32">
			{logos.map((logo, idx) => (
				<LogoButton
					key={idx}
					label={logo.label}
					src={logo.src}
					backgroundColor={logo.backgroundColor}
					url={logo.url}
				/>
			))}
		</div>
	);
};
