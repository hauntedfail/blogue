import type {
	ExpressiveCodeConfig,
	GiscusConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "haunted.fail",
	lang: "ja",
	themeColor: {
		hue: 20,
		fixed: true,
	},
	banner: {
		enable: true,
		src: "assets/images/banner.png",
		height: 60,
		extendHeight: 30,
		position: "center",
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
	toc: {
		enable: true,
		depth: 2,
	},
	favicon: [],
};

export const navBarConfig: NavBarConfig = {
	links: [LinkPreset.Home, LinkPreset.Archive, LinkPreset.About, LinkPreset.Sponsors],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.webp",
	name: "Hikaru",
	bio: "For offensive purpose only",
	links: [
		{
			name: "GitHub",
			icon: "line-md:github-loop",
			url: "https://github.com/nonnil",
		},
		{
			name: "Email",
			icon: "line-md:email-twotone",
			url: "mailto:supp@haunted.fail",
		},
		{
			name: "GitHub",
			icon: "line-md:github-loop",
			url: "https://github.com/hauntedfail/",
		},
		{
			name: "Telegram",
			icon: "line-md:telegram",
			url: "https://t.me/unittype",
		},
	],
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

export const giscusConfig: GiscusConfig = {
	repo: "hauntedfail/blogue",
	repoId: "R_kgDOSTV26w",
	category: "Announcements",
	categoryId: "DIC_kwDOSTV2684C8RM-",
	mapping: "title",
	reactionsEnabled: true,
	inputPosition: "top",
	lang: "ja",
	theme: "preferred_color_scheme",
};
