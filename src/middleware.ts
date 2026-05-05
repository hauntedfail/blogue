import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware((context, next) => {
	const { pathname, search } = context.url;
	// Astro v6 production custom endpoints with file extensions are slashless.
	// This only keeps the current catch-all OGP route reachable in dev.
	if (import.meta.env.DEV && pathname.startsWith("/og/") && pathname.endsWith(".png")) {
		return context.rewrite(`${pathname}/${search}`);
	}

	return next();
});
