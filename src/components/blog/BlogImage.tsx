type BlogImageTypes = {
	src: string;
	alt: string;
	caption: string;
	width?: number;
	height?: number;
};
export const BlogImage = ({
	caption,
	src,
	alt,
	height,
	width,
}: BlogImageTypes) => (
	<div className="my-4 flex flex-col items-center justify-center gap-2">
		<img
			className="outline-secondary bg-background z-10 rounded-2xl outline"
			src={src}
			width={width}
			height={height}
			alt={alt}
		/>

		<div className="text-xs">{caption}</div>
	</div>
);
