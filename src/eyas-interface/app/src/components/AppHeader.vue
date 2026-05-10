<template>
	<v-system-bar
		height="30"
		data-qa="window-system-bar"
		class="window-system-bar px-4 d-flex align-center justify-start bg-surface border-b"
		@mouseenter="handleHeaderMouseEnter"
		@mouseleave="handleHeaderMouseLeave"
	>
		<span class="system-bar-title text-disabled">{{ displayAppTitle }}</span>
	</v-system-bar>
	<v-app-bar
		density="compact"
		data-qa="app-header"
		@mouseenter="handleHeaderMouseEnter"
		@mouseleave="handleHeaderMouseLeave"
	>
		<!-- 1. File Group & Browser Controls -->
		<template v-for="group in groups.filter(g => g.name === 'File')" :key="group.name">
			<v-btn
				class="px-3"
				rounded="xs"
				append-icon="mdi-chevron-down"
				:data-qa="`btn-nav-group-${group.name.toLowerCase()}`"
				:active="state.activeGroup === group.name"
				@click="activate($event, group)"
				@mouseenter="onMouseEnter($event, group)"
			>
				<v-img
					v-if="group.logo"
					:src="group.logo"
					class="menu-logo mr-n1"
				/>
				<span v-else>
					<template v-for="(part, i) in group.mnemonicParts" :key="i"><u v-if="part.isMnemonic">{{ part.text }}</u><template v-else>{{ part.text }}</template></template>
				</span>
			</v-btn>

			<div class="d-flex align-center ml-2 pa-1 rounded-lg border">
				<v-btn
					v-for="control in browserControls"
					:key="control.action"
					icon
					variant="plain"
					:ripple="false"
					density="compact"
					class="mx-0"
					rounded="lg"
					:data-qa="`btn-browser-${control.action}`"
					:disabled="isControlDisabled(control.action, canGoBack, canGoForward)"
					@click="handleBrowserControlClick(control.action)"
				>
					<v-icon
						:icon="control.icon"
						size="small"
					/>
				</v-btn>
			</div>
		</template>

		<!-- 2. Links Group -->
		<template v-for="group in groups.filter(g => g.name === 'Links')" :key="group.name">
			<v-btn
				v-if="group.submenu.length"
				class="px-3 ml-2"
				rounded="xs"
				append-icon="mdi-chevron-down"
				:data-qa="`btn-nav-group-${group.name.toLowerCase()}`"
				:active="state.activeGroup === group.name"
				@click="activate($event, group)"
				@mouseenter="onMouseEnter($event, group)"
			>
				<template v-for="(part, i) in group.mnemonicParts" :key="i">
					<u v-if="part.isMnemonic">{{ part.text }}</u><template v-else>
						{{ part.text }}
					</template>
				</template>
			</v-btn>
		</template>

		<v-spacer />

		<AppHeaderOmniHub />

		<v-spacer />

		<!-- 3. Update Status -->
		<v-btn
			v-if="updateInfo.icon"
			icon
			density="compact"
			:variant="updateInfo.variant"
			:ripple="updateInfo.ripple"
			class="mr-1"
			data-qa="btn-broadcast"
			:disabled="updateInfo.disabled"
			:color="updateInfo.color"
			:class="{
				'blink-animation': updateStatus === 'checking' || updateStatus === 'downloading'
			}"
			@click="handleBroadcastClick"
		>
			<v-icon
				:icon="updateInfo.icon"
				size="small"
			/>
		</v-btn>

		<!-- 4. Tools Group -->
		<template v-for="group in groups.filter(g => g.name === 'Tools')" :key="group.name">
			<v-btn
				class="px-3"
				rounded="xs"
				append-icon="mdi-chevron-down"
				:data-qa="`btn-nav-group-${group.name.toLowerCase()}`"
				:active="state.activeGroup === group.name"
				@click="activate($event, group)"
				@mouseenter="onMouseEnter($event, group)"
			>
				<template v-for="(part, i) in group.mnemonicParts" :key="i">
					<u v-if="part.isMnemonic">{{ part.text }}</u><template v-else>
						{{ part.text }}
					</template>
				</template>
			</v-btn>
		</template>
	</v-app-bar>

	<v-menu v-model="menu" :activator="activator" location="bottom end" :offset="4" :viewport-margin="0" :open-on-click="false" :open-on-hover="false" :open-on-focus="false" :close-on-content-click="false">
		<v-list
			class="py-1"
			density="compact"
			rounded="lg"
			border
		>
			<template v-for="item in state.menuItems" :key="item.value">
				<v-divider v-if="item.divider" class="my-1 mx-2" />
				<v-list-item
					v-else
					slim
					:value="item.value"
					:prepend-icon="item.icon"
					:append-icon="item.appendIcon"
					:color="item.color"
					:ripple="item.actionable !== false"
					:class="{ [`text-${item.color}`]: item.color, 'non-actionable': item.actionable === false }"
					:disabled="item.actionable === false"
					:active="item.selected"
					data-qa="btn-nav-item"
					@click="item.actionable === false ? undefined : onItemClick(item)"
				>
					<div class="d-flex align-center w-100">
						<span class="flex-grow-1">
							<template v-for="(part, i) in item.mnemonicParts" :key="i"><u v-if="part.isMnemonic">{{ part.text }}</u><template v-else>{{ part.text }}</template></template>
						</span>
						<span
							v-if="item.shortcut"
							class="text-disabled ml-4 menu-shortcut"
						>
							{{ item.shortcut }}
						</span>
					</div>

					<v-menu
						v-if="item.submenu"
						activator="parent"
						location="end top"
						:offset="12"
						open-on-hover
						submenu
					>
						<v-list
							class="py-1"
							density="compact"
							rounded="lg"
							border
						>
							<template v-for="sub in item.submenu" :key="sub.value">
								<v-divider v-if="sub.divider" class="my-1 mx-2" />
								<v-list-item
									v-else
									slim
									:value="sub.value"
									:prepend-icon="sub.icon"
									:color="sub.color"
									:ripple="sub.actionable !== false"
									:class="{ [`text-${sub.color}`]: sub.color, 'non-actionable': sub.actionable === false }"
									:disabled="sub.actionable === false"
									:active="sub.selected"
									data-qa="btn-nav-item"
									@click="sub.actionable === false ? undefined : onItemClick(sub)"
								>
									<div class="d-flex align-center w-100">
										<span class="flex-grow-1">
											<template v-for="(part, i) in sub.mnemonicParts" :key="i"><u v-if="part.isMnemonic">{{ part.text }}</u><template v-else>{{ part.text }}</template></template>
										</span>
										<span
											v-if="sub.shortcut"
											class="text-disabled ml-4 menu-shortcut"
										>
											{{ sub.shortcut }}
										</span>
									</div>
								</v-list-item>
							</template>
						</v-list>
					</v-menu>
				</v-list-item>
			</template>
		</v-list>
	</v-menu>
</template>

<script setup lang="ts">
import { onMounted, watch, toRefs, computed } from 'vue';
import { useTheme } from 'vuetify';
import type { ChannelName } from '@registry/primitives.js';
import {
	groups, state, browserControls, isControlDisabled, handleBrowserControlClick,
	goBack, goForward, reload, goHome, handleBroadcastClick, activate,
	onMouseEnter, onItemClick, delayedClose, triggerOpen, updateInfo,
	handleNavigationUpdate, handleUpdateStatusUpdate, displayUrlInfo,
	activeEnvironmentTitle, selectEnvironment, handleHeaderMouseEnter,
	handleHeaderMouseLeave, handleUrlClick, resetTooltipText, displayAppTitle
} from './AppHeader.logic.js';

import AppHeaderOmniHub from './AppHeaderOmniHub.vue';
import useModalsStore from '@/stores/modals.js';

const { menu, activator, canGoBack, canGoForward, updateStatus, environments, currentEnvironment, tooltipVisible, tooltipText, cursorPos, appTitle } = toRefs(state);
const modalsStore = useModalsStore();
const theme = useTheme();

const overlayColors = computed(() => {
	const isDark = theme.global.current.value.dark;
	if (modalsStore.hasVisibleModals) {
		return { color: isDark ? `#141414` : `#949597`, symbolColor: `#ffffff` };
	}
	if (isDark) {
		return { color: `#212121`, symbolColor: `#ffffff` };
	}
	return { color: `#f7f9fb`, symbolColor: `#191c1e` };
});

watch(menu, isOpen => {
	if (!isOpen) {
		delayedClose();
		state.activeGroup = null;
	}
});

watch(overlayColors, colors => {
	window.eyas?.send(`update-titlebar-overlay` as ChannelName, colors);
}, { immediate: true });

onMounted(() => {
	window.eyas?.receive(`ui-shown` as ChannelName, triggerOpen);
	window.eyas?.receive(`navigation-state-updated` as ChannelName, handleNavigationUpdate);
	window.eyas?.receive(`update-status-updated` as ChannelName, handleUpdateStatusUpdate);
});

// expose for testing
defineExpose({
	menu, tooltipVisible, tooltipText, cursorPos, canGoBack, canGoForward,
	activate, onMouseEnter, onItemClick, onBrowserControlClick: handleBrowserControlClick,
	goBack, goForward, reload, goHome, handleBroadcastClick, displayUrlInfo,
	environments, currentEnvironment, activeEnvironmentTitle, selectEnvironment,
	handleHeaderMouseEnter, handleHeaderMouseLeave, handleUrlClick, resetTooltipText,
	appTitle, displayAppTitle, envMenu: toRefs(state).envMenu,
	menuItems: toRefs(state).menuItems, activator: toRefs(state).activator
});
</script>

<style scoped>
.menu-logo { height: 1.5em; width: 1.5em; }
.menu-shortcut { font-size: 0.65rem !important; opacity: 0.6 !important; }
.non-actionable { cursor: default !important; pointer-events: none; opacity: 0.5; }
.v-btn--active, .v-list-item--active { background-color: rgba(var(--v-theme-primary), 0.1) !important; color: rgb(var(--v-theme-primary)) !important; }
.blink-animation { animation: blink 1s infinite; }
@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
.window-system-bar { -webkit-app-region: drag; user-select: none; --v-border-opacity: 0.06 !important; }
.system-bar-title { font-size: 0.75rem; font-weight: 800; user-select: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
</style>
