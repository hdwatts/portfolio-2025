type BlogImageTypes = {
	src: string;
	alt: string;
	caption: string;
	width?: number;
};
export const BlogImage = ({
	caption,
	src,
	alt,
	width = 400,
}: BlogImageTypes) => (
	<div className="my-4 flex flex-col items-center justify-center gap-2">
		<img
			className="outline-secondary bg-background z-10 rounded-2xl outline"
			src={src}
			width={width}
			alt={alt}
		/>

		<div className="text-xs">{caption}</div>
	</div>
);
