import type { PropsWithChildren } from "react";
import { Avatar, AvatarFallback } from "./ShadCnAvatar";

export const HeadshotAvatar = ({ children }: PropsWithChildren) => (
	<Avatar className="border-secondary outline-secondary z-0 h-52 w-52 border-6 outline-0 sm:h-24 sm:w-24 sm:border-0 sm:outline-4">
		<AvatarFallback className="absolute top-0 left-0">HD</AvatarFallback>
		{children}
	</Avatar>
);
