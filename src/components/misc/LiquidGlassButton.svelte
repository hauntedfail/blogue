<script lang="ts">
	let className = "";
	export { className as class };
	export let id: string | undefined = undefined;
	export let href: string | undefined = undefined;
	export let target: string | null | undefined = undefined;
	export let rel: string | undefined = undefined;
	export let ariaLabel: string | undefined = undefined;
	export let name: string | undefined = undefined;
	export let type: "button" | "submit" | "reset" = "button";
	export let onclick: ((event: MouseEvent) => void) | undefined = undefined;
	export let onmouseenter: ((event: MouseEvent) => void) | undefined = undefined;
	export let contrast: "light" | "dark" | "light-contrast" | "dark-contrast" = "light";
	export let accent = "var(--primary)";
	export let roundness = "0.75rem";

	$: isDark = contrast === "dark" || contrast === "dark-contrast";
	$: contrastClass = isDark ? "is-dark" : "is-light";
	$: hostClass = `liquid-glass-button ${contrastClass} ${className}`;
	$: hostStyle = `--lg-radius: ${roundness}; --lg-accent: ${accent};`;
</script>

{#if href}
	<a
		{id}
		{href}
		{target}
		{rel}
		aria-label={ariaLabel}
		{onclick}
		{onmouseenter}
		class={hostClass}
		style={hostStyle}
	>
		<span class="liquid-glass-button-filter"></span>
		<span class="liquid-glass-button-shadow"></span>
		<span class="liquid-glass-button-tint"></span>
		<span class="liquid-glass-button-highlight"></span>
		<span class="liquid-glass-button-content">
			<slot />
		</span>
	</a>
{:else}
	<button
		{id}
		{type}
		{name}
		aria-label={ariaLabel}
		{onclick}
		{onmouseenter}
		class={hostClass}
		style={hostStyle}
	>
		<span class="liquid-glass-button-filter"></span>
		<span class="liquid-glass-button-shadow"></span>
		<span class="liquid-glass-button-tint"></span>
		<span class="liquid-glass-button-highlight"></span>
		<span class="liquid-glass-button-content">
			<slot />
		</span>
	</button>
{/if}
