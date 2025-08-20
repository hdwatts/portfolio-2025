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
							ball. You have ten shots. No more, no less. One
							point for a basket. Two points for a clean swish.
							Precision and discipline are rewarded. When it's
							over, creenshot your scoreboard and share with your
							fellow I.S.R.U. campers. If it isn't documented, it
							didn't happen.
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
