import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;
	if (pathname.startsWith("/og/") && pathname.endsWith(".png")) {
		return context.rewrite(`${pathname}/${search}`);
	}

	return next();
});
