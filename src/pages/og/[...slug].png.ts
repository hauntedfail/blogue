import { type CollectionEntry, getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	createCanvas,
	GlobalFonts,
	loadImage,
	type Image,
	type SKRSContext2D,
} from "@napi-rs/canvas";
import type { APIRoute, GetStaticPaths } from "astro";
import { siteConfig } from "@/config";
import { formatDateToYYYYMMDD } from "@/utils/date-utils";

export const prerender = true;

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING_X = 96;
const FONT_FAMILY = "IPAGothic";
const TEXT_COLOR = "#000000";
const ACCENT_COLOR = "#ff173b";
const PAGE_BACKGROUND_COLOR = "#f8f8f8";

const fontPath = fileURLToPath(new URL("../../assets/og/fonts/ipag.ttf", import.meta.url));
const backgroundPath = path.join(process.cwd(), "src/assets/og/fonts/bg.png");
GlobalFonts.registerFromPath(fontPath, FONT_FAMILY);
const backgroundImagePromise = loadImage(readFileSync(backgroundPath));

function normalizeTitle(title: string): string {
	return title.replace(/\s+/g, " ").trim();
}

function hasLatinLetters(value: string): boolean {
	return /[a-z]/i.test(value);
}

function displayTitle(title: string): string {
	const normalized = normalizeTitle(title) || siteConfig.title;
	return hasLatinLetters(normalized) ? normalized.toUpperCase() : normalized;
}

function displayDomainTitle(title: string): string | null {
	const normalized = normalizeTitle(title) || siteConfig.title;
	if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(normalized)) return null;

	const dotIndex = normalized.indexOf(".");
	const name = normalized.slice(0, dotIndex).toUpperCase();
	const suffix = normalized.slice(dotIndex).toLowerCase();
	return `${name}\n${suffix}`;
}

function measureText(ctx: SKRSContext2D, text: string, fontSize: number): number {
	ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
	return ctx.measureText(text).width;
}

function collectSplitCandidates(title: string): Array<[string, string]> {
	const domainTitle = displayDomainTitle(title);
	if (domainTitle) return [domainTitle.split("\n") as [string, string]];

	const normalized = displayTitle(title);
	const candidates: Array<[string, string]> = [];
	const words = normalized.split(" ").filter(Boolean);
	for (let index = 1; index < words.length; index += 1) {
		candidates.push([words.slice(0, index).join(" "), words.slice(index).join(" ")]);
	}

	for (let index = 1; index < normalized.length; index += 1) {
		const prev = normalized[index - 1];
		const current = normalized[index];
		let splitIndex: number | null = null;

		if (prev === " ") splitIndex = index - 1;
		if (current === ".") splitIndex = index;
		if (["/", ":", ";"].includes(prev)) splitIndex = index;
		if (["-", "–", "—"].includes(prev)) splitIndex = index;

		if (splitIndex === null) continue;

		const left = normalized.slice(0, splitIndex).trim();
		const right = normalized.slice(splitIndex).trim();
		if (left && right) {
			candidates.push([left, right]);
		}
	}

	return candidates;
}

function splitTitle(ctx: SKRSContext2D, title: string, fontSize: number): [string, string | null] {
	const normalized = displayTitle(title);
	const candidates = collectSplitCandidates(title);
	if (candidates.length === 0) {
		return [normalized, null];
	}

	let best = candidates[0];
	let bestScore = Number.POSITIVE_INFINITY;

	for (const candidate of candidates) {
		const [left, right] = candidate;
		const leftWidth = measureText(ctx, left, fontSize);
		const rightWidth = measureText(ctx, right, fontSize);
		const widest = Math.max(leftWidth, rightWidth);
		const balance = Math.abs(leftWidth - rightWidth);
		const score = widest * 1.2 + balance;
		if (score < bestScore) {
			best = candidate;
			bestScore = score;
		}
	}

	return best;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function drawCoverImage(ctx: SKRSContext2D, image: Image): void {
	const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
	const drawWidth = image.width * scale;
	const drawHeight = image.height * scale;
	const drawX = (WIDTH - drawWidth) / 2;
	const drawY = (HEIGHT - drawHeight) / 2;
	ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawBackground(ctx: SKRSContext2D, image: Image): void {
	ctx.fillStyle = PAGE_BACKGROUND_COLOR;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	drawCoverImage(ctx, image);

	ctx.strokeStyle = "rgba(247, 27, 58, 0.16)";
	ctx.lineWidth = 1.4;
	ctx.setLineDash([2, 14]);
	ctx.strokeRect(60, 44, WIDTH - 120, HEIGHT - 88);
	ctx.setLineDash([]);
}

function drawMeta(ctx: SKRSContext2D, published: string): void {
	ctx.textAlign = "left";
	ctx.fillStyle = "#000000";
	ctx.font = `600 26px ${FONT_FAMILY}`;
	ctx.fillText(siteConfig.title, PADDING_X, 96);
	if (published) {
		ctx.fillText(published, PADDING_X, 560);
	}
}

function drawTitle(ctx: SKRSContext2D, title: string): void {
	const maxTextWidth = WIDTH - PADDING_X * 2;
	let headlineFontSize = 128;
	let highlightFontSize = 110;
	let headline = "";
	let highlight: string | null = null;

	while (headlineFontSize >= 64) {
		[headline, highlight] = splitTitle(ctx, title, headlineFontSize);
		highlightFontSize = highlight ? clamp(headlineFontSize * 0.94, 64, 110) : 0;
		const headlineWidth = measureText(ctx, headline, headlineFontSize);
		const highlightWidth = highlight ? measureText(ctx, highlight, highlightFontSize) : 0;
		if (headlineWidth <= maxTextWidth && highlightWidth <= maxTextWidth - 160) break;
		headlineFontSize -= 6;
	}

	if (!headline) {
		headline = displayTitle(title);
	}

	const singleLine = !highlight;
	const topY = singleLine ? 296 : 196;

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = TEXT_COLOR;
	ctx.font = `700 ${headlineFontSize}px ${FONT_FAMILY}`;
	ctx.fillText(headline, WIDTH / 2, topY);

	if (!highlight) {
		ctx.fillStyle = ACCENT_COLOR;
		ctx.beginPath();
		ctx.roundRect(296, 398, 608, 10, 5);
		ctx.fill();
		return;
	}

	const highlightTextWidth = measureText(ctx, highlight, highlightFontSize);
	const ribbonHeight = Math.max(108, highlightFontSize + 32);
	const ribbonWidth = clamp(highlightTextWidth + 150, 520, 978);
	const ribbonX = (WIDTH - ribbonWidth) / 2;
	const ribbonY = 292;
	const highlightY = ribbonY + ribbonHeight / 2 + 2;

	ctx.fillStyle = "rgba(255, 23, 59, 0.28)";
	ctx.fillRect(ribbonX, ribbonY, ribbonWidth, ribbonHeight);
	ctx.fillStyle = TEXT_COLOR;
	ctx.font = `700 ${highlightFontSize}px ${FONT_FAMILY}`;
	ctx.fillText(highlight, WIDTH / 2, highlightY);
}

export const getStaticPaths: GetStaticPaths = async () => {
	const posts: CollectionEntry<"posts">[] = await getCollection(
		"posts",
		(entry: CollectionEntry<"posts">) => {
			return import.meta.env.PROD ? entry.data.draft !== true : true;
		},
	);

	return posts.map((entry: CollectionEntry<"posts">) => ({
		params: { slug: entry.id },
		props: { entry },
	}));
};

export const GET: APIRoute = async ({ params, props }) => {
	let entry = props?.entry as CollectionEntry<"posts"> | undefined;
	if (!entry) {
		const slug = Array.isArray(params.slug) ? params.slug.join("/") : params.slug;
		if (slug) {
			const posts: CollectionEntry<"posts">[] = await getCollection(
				"posts",
				(post: CollectionEntry<"posts">) => {
					return import.meta.env.PROD ? post.data.draft !== true : true;
				},
			);
			entry = posts.find((post: CollectionEntry<"posts">) => post.id === slug);
		}
	}
	if (!entry) {
		return new Response("Not found", { status: 404 });
	}

	const title = normalizeTitle(entry.data.title) || siteConfig.title;
	const published = entry.data.published ? formatDateToYYYYMMDD(entry.data.published) : "";

	const canvas = createCanvas(WIDTH, HEIGHT);
	const ctx = canvas.getContext("2d");
	ctx.textBaseline = "top";
	const backgroundImage = await backgroundImagePromise;

	drawBackground(ctx, backgroundImage);
	drawMeta(ctx, published);
	drawTitle(ctx, title);

	const buffer = canvas.toBuffer("image/png");
	return new Response(new Uint8Array(buffer), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
