const apiBaseURL = 'https://api.twitter.com';

/**
 * Removes the leading "/api/" portion of a matched route, and rewrites it to
 * match the desired Twitter API route.
 * @param route Matched route string.
 */
export const buildURL = (route: string): string => {
	let apiRoute;
	if (route.startsWith('/api/')) {
		apiRoute = route.slice(5);
	} else if (route.startsWith('api/')) {
		apiRoute = route.slice(4);
	} else if (route.startsWith('/')) {
		apiRoute = route.slice(1);
	} else {
		apiRoute = route;
	}
	return `${apiBaseURL}/${apiRoute}`;
};
