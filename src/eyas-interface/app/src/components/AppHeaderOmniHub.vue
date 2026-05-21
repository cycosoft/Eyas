<template>
	<!-- Center Omni-Hub (Placeholder Container) -->
	<div
		v-ripple="!displayUrlInfo.isFallback"
		class="omni-hub-container d-flex align-center border rounded-lg px-3 py-1 bg-surface-variant/10 mx-4"
		:style="{
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
			class="lock-icon"
			:class="displayUrlInfo.isSecure ? 'text-medium-emphasis mr-2' : 'mr-2'"
			data-qa="omni-hub-lock"
			@click.stop
			@mousedown.stop
		/>

		<!-- 2. Online Status Badge Placeholder (Offline status default) -->
		<v-chip
			size="x-small"
			density="compact"
			variant="tonal"
			:color="testNetworkEnabled ? 'success' : 'error'"
			class="status-chip mr-2 font-weight-bold text-uppercase"
			data-qa="omni-hub-status"
			@click.stop="toggleNetwork"
			@mousedown.stop
		>
			{{ testNetworkEnabled ? 'Online' : 'Offline' }}
		</v-chip>

		<!-- 3. URL Placeholder -->
		<span
			class="url-text text-caption text-truncate d-inline-block"
			:class="{
				'font-mono text-medium-emphasis': !displayUrlInfo.isFallback,
				'text-disabled': displayUrlInfo.isFallback
			}"
			:style="{
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

		<!-- JS Errors & Warnings Indicators -->
		<div
			v-if="jsErrorsCount > 0 || jsWarningsCount > 0"
			class="d-flex align-center ml-2 pl-2 border-s mr-3 omni-hub-indicators"
			@click.stop="openDevToolsConsole"
			@mousedown.stop
		>
			<!-- Error Count -->
			<div
				v-if="jsErrorsCount > 0"
				class="d-flex align-center mr-2 text-error cursor-pointer font-weight-bold"
				data-qa="omni-hub-errors"
			>
				<v-icon
					icon="mdi-alert-circle"
					size="x-small"
					class="mr-1"
				/>
				<span class="indicator-count">{{ jsErrorsCount }}</span>
				<v-tooltip activator="parent" location="bottom">
					{{ jsErrorsCount }} JS Error{{ jsErrorsCount > 1 ? 's' : '' }}
				</v-tooltip>
			</div>

			<!-- Warning Count -->
			<div
				v-if="jsWarningsCount > 0"
				class="d-flex align-center text-warning cursor-pointer font-weight-bold"
				data-qa="omni-hub-warnings"
			>
				<v-icon
					icon="mdi-alert"
					size="x-small"
					class="mr-1"
				/>
				<span class="indicator-count">{{ jsWarningsCount }}</span>
				<v-tooltip activator="parent" location="bottom">
					{{ jsWarningsCount }} JS Warning{{ jsWarningsCount > 1 ? 's' : '' }}
				</v-tooltip>
			</div>
		</div>

		<!-- 4. Dropdown Button Placeholder -->
		<v-btn
			v-if="environments.length > 0 && isViewingTestContent"
			size="x-small"
			density="compact"
			variant="tonal"
			color="info"
			:append-icon="environments.length > 1 ? 'mdi-chevron-down' : undefined"
			class="env-btn font-weight-bold text-uppercase"
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
	handleUrlClick, handleCursorMove, resetTooltipText, delayedClose,
	toggleNetwork, isViewingTestContent
} from './AppHeader.logic.js';

const { environments, currentEnvironment, envMenu, tooltipVisible, tooltipText, cursorPos, testNetworkEnabled, jsErrorsCount, jsWarningsCount } = toRefs(state);

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

function openDevToolsConsole(): void {
	window.eyas?.send(`open-devtools-console` as ChannelName);
}
</script>

<style scoped>
.omni-hub-container {
	flex-grow: 15;
	width: 0;
	max-width: 800px;
	height: 32px;
	overflow: hidden;
	position: relative;
	--v-border-opacity: 0.06 !important;
}

.lock-icon {
	flex-shrink: 0;
	cursor: default;
}

.status-chip {
	font-size: 8px !important;
	height: 18px;
	flex-shrink: 0;
	cursor: pointer;
	border: 1px solid currentColor !important;
}

.url-text {
	flex-grow: 1;
	min-width: 100px;
	width: 0;
	font-size: 10px !important;
	margin-right: .25rem;
}

.env-btn {
	font-size: 8px !important;
	height: 18px;
	flex-shrink: 0;
}

.env-item {
	font-size: 10px;
}

.indicator-count {
	font-size: 10px !important;
	line-height: 1;
}

.omni-hub-indicators {
	height: 16px;
	border-color: rgba(var(--v-border-color), 0.15) !important;
	cursor: pointer;
}
</style>
