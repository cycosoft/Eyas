<template>
	<!-- Center Omni-Hub (Placeholder Container) -->
	<div
		v-ripple="!displayUrlInfo.isFallback"
		class="omni-hub-container d-flex align-center border rounded-lg px-3 py-1 bg-surface-variant/10 mx-4"
		:style="{
			flexGrow: 15,
			width: 0,
			maxWidth: '800px',
			height: '32px',
			overflow: 'hidden',
			position: 'relative',
			cursor: displayUrlInfo.isFallback ? 'default' : 'pointer'
		}"
		data-qa="omni-hub-container"
		@click="handleUrlClick"
	>
		<!-- 1. Lock Icon Placeholder -->
		<v-icon
			:icon="displayUrlInfo.isSecure ? 'mdi-lock' : 'mdi-lock-off'"
			size="x-small"
			:color="displayUrlInfo.isSecure ? undefined : 'error'"
			:class="displayUrlInfo.isSecure ? 'text-medium-emphasis mr-2' : 'mr-2'"
			style="flex-shrink: 0; cursor: default;"
			data-qa="omni-hub-lock"
			@click.stop
			@mousedown.stop
		/>

		<!-- 2. Online Status Badge Placeholder (Offline status default) -->
		<v-chip
			size="x-small"
			density="compact"
			variant="flat"
			color="error"
			class="mr-2 font-weight-bold text-uppercase"
			style="font-size: 8px !important; height: 18px; flex-shrink: 0; cursor: default;"
			data-qa="omni-hub-status"
			@click.stop
			@mousedown.stop
		>
			Offline
		</v-chip>

		<!-- 3. URL Placeholder -->
		<span
			class="text-caption text-truncate d-inline-block"
			:class="{
				'font-mono text-medium-emphasis': !displayUrlInfo.isFallback,
				'text-disabled': displayUrlInfo.isFallback
			}"
			:style="{
				flexGrow: 5,
				minWidth: '100px',
				width: 0,
				fontSize: '10px !important',
				opacity: displayUrlInfo.isFallback ? 0.5 : 0.8
			}"
			data-qa="omni-hub-url"
			@mousemove="handleCursorMove"
		>
			{{ displayUrlInfo.text }}
			<v-tooltip
				v-if="!displayUrlInfo.isFallback"
				v-model="tooltipVisible"
				location="bottom start"
				activator="parent"
				:target="cursorPos"
			>
				{{ tooltipText }}
			</v-tooltip>
		</span>

		<!-- 4. Dropdown Button Placeholder -->
		<v-btn
			v-if="environments.length > 0"
			size="x-small"
			density="compact"
			variant="tonal"
			color="info"
			:append-icon="environments.length > 1 ? 'mdi-chevron-down' : undefined"
			class="font-weight-bold text-uppercase"
			style="font-size: 8px !important; height: 18px; flex-shrink: 0;"
			data-qa="omni-hub-env-dropdown"
			:disabled="environments.length <= 1"
		>
			{{ activeEnvironmentTitle }}

			<v-menu
				v-if="environments.length > 1"
				v-model="envMenu"
				activator="parent"
				location="bottom center"
				:offset="4"
			>
				<v-list
					class="py-1"
					density="compact"
					rounded="lg"
					border
				>
					<v-list-item
						v-for="(env, index) in environments"
						:key="env.url"
						slim
						class="env-item font-weight-bold text-uppercase"
						style="font-size: 10px;"
						:active="env.url === currentEnvironment"
						@click="selectEnvironment(env, index)"
					>
						{{ env.title }}
					</v-list-item>
				</v-list>
			</v-menu>
		</v-btn>
	</div>
</template>

<script setup lang="ts">
import { watch, toRefs } from 'vue';
import type { ChannelName } from '@registry/primitives.js';
import {
	state, displayUrlInfo, activeEnvironmentTitle, selectEnvironment,
	handleUrlClick, handleCursorMove, resetTooltipText, delayedClose
} from './AppHeader.logic.js';

const { environments, currentEnvironment, envMenu, tooltipVisible, tooltipText, cursorPos } = toRefs(state);

watch(envMenu, isOpen => {
	if (isOpen) {
		window.eyas?.send(`show-ui` as ChannelName);
	} else {
		delayedClose();
	}
});

watch(tooltipVisible, isOpen => {
	if (!isOpen) {
		resetTooltipText();
	}
});
</script>
