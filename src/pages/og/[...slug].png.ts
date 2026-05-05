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
const TITLE_MAX_FONT_SIZE = 128;
const TITLE_MIN_FONT_SIZE = 42;

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

function displayDomainTitle(title: string): [string, string] | null {
	const normalized = normalizeTitle(title) || siteConfig.title;
	if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(normalized)) return null;

	const dotIndex = normalized.indexOf(".");
	const name = normalized.slice(0, dotIndex).toUpperCase();
	const suffix = normalized.slice(dotIndex).toUpperCase();
	return [name, suffix];
}

function measureText(ctx: SKRSContext2D, text: string, fontSize: number): number {
	ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
	return ctx.measureText(text).width;
}

function splitGraphemes(text: string): string[] {
	if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
		const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
		return Array.from(segmenter.segment(text), (segment) => segment.segment);
	}
	return Array.from(text);
}

function collectDelimitedCandidates(title: string): string[][] {
	const normalized = displayTitle(title);
	const candidates: string[][] = [];
	const seen = new Set<string>();
	const addCandidate = (lines: string[]): void => {
		const trimmed = lines.map((line) => line.trim()).filter(Boolean);
		if (trimmed.length < 2) return;
		const key = trimmed.join("\n");
		if (seen.has(key)) return;
		seen.add(key);
		candidates.push(trimmed);
	};

	const words = normalized.split(" ").filter(Boolean);
	for (let index = 1; index < words.length; index += 1) {
		addCandidate([words.slice(0, index).join(" "), words.slice(index).join(" ")]);
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
		addCandidate([normalized.slice(0, splitIndex), normalized.slice(splitIndex)]);
	}

	return candidates;
}

function collectGraphemeCandidates(title: string): string[][] {
	const normalized = displayTitle(title);
	const chars = splitGraphemes(normalized);
	const candidates: string[][] = [];
	const seen = new Set<string>();
	const addCandidate = (lines: string[]): void => {
		const trimmed = lines.map((line) => line.trim()).filter(Boolean);
		if (trimmed.length < 2) return;
		const key = trimmed.join("\n");
		if (seen.has(key)) return;
		seen.add(key);
		candidates.push(trimmed);
	};

	for (let index = 1; index < chars.length; index += 1) {
		addCandidate([chars.slice(0, index).join(""), chars.slice(index).join("")]);
	}

	for (let first = 1; first < chars.length - 1; first += 1) {
		for (let second = first + 1; second < chars.length; second += 1) {
			addCandidate([
				chars.slice(0, first).join(""),
				chars.slice(first, second).join(""),
				chars.slice(second).join(""),
			]);
		}
	}

	return candidates;
}

function collectLineCandidates(title: string): string[][] {
	const domainTitle = displayDomainTitle(title);
	if (domainTitle) return [domainTitle];
	const normalized = displayTitle(title);
	return [[normalized], ...collectDelimitedCandidates(title), ...collectGraphemeCandidates(title)];
}

function chooseTitleLines(ctx: SKRSContext2D, title: string, fontSize: number): string[] {
	const candidates = collectLineCandidates(title);
	let best = candidates[0] ?? [displayTitle(title)];
	let bestScore = Number.POSITIVE_INFINITY;

	for (const candidate of candidates) {
		const widths = candidate.map((line, index) => {
			const lineFontSize =
				index === 1 && candidate.length > 1 ? clamp(fontSize * 0.94, 36, 110) : fontSize;
			return measureText(ctx, line, lineFontSize);
		});
		const widest = Math.max(...widths);
		const narrowest = Math.min(...widths);
		const linePenalty = candidate.length === 1 ? 400 : candidate.length * 28;
		const score = widest * 1.15 + (widest - narrowest) + linePenalty;
		if (score < bestScore) {
			best = candidate;
			bestScore = score;
		}
	}

	return best;
}

function titleLineFontSize(fontSize: number, index: number, lineCount: number): number {
	return index === 1 && lineCount > 1 ? clamp(fontSize * 0.94, 24, 110) : fontSize;
}

function titleLineMaxWidth(index: number, lineCount: number, maxTextWidth: number): number {
	return index === 1 && lineCount > 1 ? maxTextWidth - 160 : maxTextWidth;
}

function titleLinesFit(
	ctx: SKRSContext2D,
	lines: string[],
	fontSize: number,
	maxTextWidth: number,
): boolean {
	return lines.every((line, index) => {
		const lineFontSize = titleLineFontSize(fontSize, index, lines.length);
		const maxWidth = titleLineMaxWidth(index, lines.length, maxTextWidth);
		return measureText(ctx, line, lineFontSize) <= maxWidth;
	});
}

function layoutTitle(ctx: SKRSContext2D, title: string): { lines: string[]; fontSize: number } {
	const maxTextWidth = WIDTH - PADDING_X * 2;
	let fontSize = TITLE_MAX_FONT_SIZE;
	let lines = chooseTitleLines(ctx, title, fontSize);

	while (fontSize >= TITLE_MIN_FONT_SIZE) {
		lines = chooseTitleLines(ctx, title, fontSize);
		if (titleLinesFit(ctx, lines, fontSize, maxTextWidth)) break;
		fontSize -= 6;
	}

	while (!titleLinesFit(ctx, lines, fontSize, maxTextWidth) && fontSize > 24) {
		fontSize -= 2;
		lines = chooseTitleLines(ctx, title, fontSize);
	}

	return { lines, fontSize };
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
	const { lines, fontSize } = layoutTitle(ctx, title);
	const [headline, highlight, tail] = lines;
	const singleLine = lines.length === 1;
	const topY = singleLine ? 296 : 196;

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = TEXT_COLOR;
	ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
	ctx.fillText(headline, WIDTH / 2, topY, WIDTH - PADDING_X * 2);

	if (!highlight) {
		ctx.fillStyle = ACCENT_COLOR;
		ctx.beginPath();
		ctx.roundRect(296, 398, 608, 10, 5);
		ctx.fill();
		return;
	}

	const highlightFontSize = titleLineFontSize(fontSize, 1, lines.length);
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
	ctx.fillText(highlight, WIDTH / 2, highlightY, WIDTH - PADDING_X * 2 - 160);

	if (tail) {
		ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
		ctx.fillText(tail, WIDTH / 2, 438, WIDTH - PADDING_X * 2);
	}
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
