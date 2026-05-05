<script lang="ts">
	let className = "";
	export { className as class };
	export let id: string | undefined = undefined;
	export let style = "";
	export let contrast: "light" | "dark" | "light-contrast" | "dark-contrast" = "light";
	export let accent = "var(--primary)";
	export let roundness = "var(--radius-large)";

	$: isDark = contrast === "dark" || contrast === "dark-contrast";
	$: contrastClass = isDark ? "is-dark" : "is-light";
	$: hostStyle = `--lg-radius: ${roundness}; --lg-accent: ${accent}; ${style}`;
</script>

<div id={id} class={`liquid-glass-core ${contrastClass} ${className}`} style={hostStyle}>
	<div class="liquid-glass-filter"></div>
	<div class="liquid-glass-shadow"></div>
	<div class="liquid-glass-tint"></div>
	<div class="liquid-glass-highlight"></div>
	<div class="liquid-glass-content">
		<slot />
	</div>
</div>
