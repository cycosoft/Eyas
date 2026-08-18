<template>
	<component
		:is="tag"
		class="selectable-card"
		:class="{ 'selectable-card--accent': persistAccent, 'selectable-card--icon-accent': persistIcon, 'selectable-card--loading': loading }"
		:style="{ '--selectable-card-accent': accentColor }"
		:type="tag === `button` ? `button` : undefined"
		:disabled="tag === `button` && (disabled || loading) ? true : undefined"
	>
		<span class="selectable-card__icon">
			<v-progress-circular v-if="loading" indeterminate size="20" width="2" color="currentColor" />
			<slot v-else name="icon" />
		</span>
		<span class="selectable-card__content">
			<slot />
		</span>
		<slot name="trailing" />
	</component>
</template>

<script setup lang="ts">
import type { ColorHex, IsActive } from '@registry/primitives.js';

type SelectableCardProps = {
	tag?: `button` | `li`;
	accentColor?: ColorHex;
	persistAccent?: IsActive;
	persistIcon?: IsActive;
	loading?: IsActive;
	disabled?: IsActive;
};

withDefaults(defineProps<SelectableCardProps>(), {
	tag: `button`,
	accentColor: `#58A1D6`,
	persistAccent: false,
	persistIcon: false,
	loading: false,
	disabled: false
});
</script>

<style scoped>
.selectable-card {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem;
	width: 100%;
	border: 2px solid transparent;
	border-left: 4px solid transparent;
	border-radius: 8px;
	background-color: rgba(255, 255, 255, 0.6);
	cursor: pointer;
	text-align: left;
	font: inherit;
	color: inherit;
	transition: all 0.2s ease-in-out;
}

.selectable-card:hover,
.selectable-card--accent {
	background-color: #ffffff;
	border-color: color-mix(in srgb, var(--selectable-card-accent) 30%, transparent);
	border-left-color: var(--selectable-card-accent);
	box-shadow: 0px 3px 3px color-mix(in srgb, var(--selectable-card-accent) 15%, transparent);
}

.selectable-card:hover {
	transform: translateY(-1px);
}

.selectable-card--loading {
	cursor: default;
	pointer-events: none;
}

.selectable-card:hover .selectable-card__icon,
.selectable-card--accent .selectable-card__icon,
.selectable-card--icon-accent .selectable-card__icon {
	background-color: color-mix(in srgb, var(--selectable-card-accent) 10%, transparent);
	color: var(--selectable-card-accent);
}

.selectable-card__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	flex-shrink: 0;
	background-color: rgba(25, 28, 30, 0.05);
	color: rgba(25, 28, 30, 0.6);
	transition: all 0.2s ease-in-out;
}

.selectable-card__content {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;
}

/*
	Generic hover-swap for trailing slot content: a resting affordance (e.g. a chevron) that's
	replaced by an action only reachable on hover (e.g. a button), overlaid so swapping never
	shifts layout. Slotted content is owned by the parent's template scope, not this component's,
	so every selector reaching into the trailing slot needs :deep() or it silently never matches.
*/
.selectable-card :deep(.selectable-card__trailing) {
	position: relative;
	width: 28px;
	height: 28px;
	flex-shrink: 0;
}

.selectable-card :deep(.selectable-card__trailing-rest),
.selectable-card :deep(.selectable-card__trailing-hover) {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.15s ease-in-out;
}

.selectable-card :deep(.selectable-card__trailing-hover) {
	opacity: 0;
	pointer-events: none;
}

.selectable-card:hover :deep(.selectable-card__trailing-rest) {
	opacity: 0;
}

.selectable-card:hover :deep(.selectable-card__trailing-hover) {
	opacity: 1;
	pointer-events: auto;
}
</style>
