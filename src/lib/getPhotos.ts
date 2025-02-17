import { getCollection } from "astro:content";

export const getPhotos = async () => {
	let seed = 5;
	function random() {
		seed = seed + 1001;
		var x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	}
	return (await getCollection("photographs")).sort((a, b) => random() - 0.5);
};
