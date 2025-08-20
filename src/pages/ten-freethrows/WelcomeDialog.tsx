import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../../components/Dialog";

export const WelcomeDialog = () => {
	const [open, setOpen] = useState(true);

	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ten Free Throws</DialogTitle>
						<DialogDescription>
							Ten Free Throws is a simple game made for the
							I.S.R.U. Summer Camp. Drag anywhere on the screen to
							launch the ball at the hoop.
							<br />
							<br />
							You have <b>ten</b> free throw shots to get as many
							points as possible. Swishes are worth <b>two</b>{" "}
							points!
							<br />
							<br />
							At the end, <b>screenshot</b> the scoreboards and
							share them with your fellow I.S.R.U campers.
							<br />
							<br />
							It was made with ❤️ by{" "}
							<a
								className="text-red-500 underline"
								href="https://www.hdwatts.com/"
							>
								@hdwatts
							</a>
							.
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	);
};
