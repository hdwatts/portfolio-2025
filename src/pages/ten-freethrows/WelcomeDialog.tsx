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
							Drag your finger across the screen to launch the
							ball. You have <b>ten</b> shots. No more, no less.{" "}
							<b>One</b> point for a basket. <b>Two</b> points for
							a clean swish. Precision and discipline are
							rewarded. When it's over, <b>screenshot</b> your
							scoreboard and share with your fellow{" "}
							<a
								className="text-red-500 underline"
								href="https://isrucamp.com/"
							>
								I.S.R.U
							</a>{" "}
							campers. If it isn't documented, it didn't happen.
							<br />
							<br />
							This is not a game. It is your ritual.
							<br />
							<br />
							Crafted by{" "}
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
