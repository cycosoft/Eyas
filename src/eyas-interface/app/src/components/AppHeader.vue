<template>
	<v-app-bar
		density="compact"
		data-qa="app-header"
	>
		<template v-for="group in groups" :key="group.name">
			<v-btn
				class="px-3"
				rounded="xs"
				append-icon="mdi-chevron-down"
				:title="group.title"
				:data-qa="`btn-nav-group-${group.name.toLowerCase()}`"
				:active="activeGroup === group.name"
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

			<template v-if="group.name === 'File'">
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

				<v-spacer />
			</template>
		</template>
	</v-app-bar>

	<v-menu
		v-model="menu"
		:activator="activator"
		location="bottom end"
		:offset="4"
		:viewport-margin="0"
		:open-on-click="false"
		:open-on-hover="false"
		:open-on-focus="false"
		:close-on-content-click="false"
	>
		<v-list
			class="py-1"
			density="compact"
			rounded="lg"
			border
		>
			<template v-for="item in menuItems" :key="item.value">
				<v-divider v-if="item.divider" class="my-1 mx-2" />
				<v-list-item
					v-else
					slim
					:value="item.value"
					:prepend-icon="item.icon"
					:append-icon="item.appendIcon"
					:color="item.color"
					:ripple="item.actionable !== false"
					:class="{
						[`text-${item.color}`]: item.color,
						'non-actionable': item.actionable === false
					}"
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
									:class="{
										[`text-${sub.color}`]: sub.color,
										'non-actionable': sub.actionable === false
									}"
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
import { ref, onMounted, watch } from 'vue';
import useModalsStore from '@/stores/modals.js';
import type { NavGroup, NavItem, NavActivateEvent, PendingNavOpen } from '@registry/components.js';
import type { ChannelName } from '@registry/primitives.js';
import type { NavigationStatePayload } from '@registry/ipc.js';
import { groups, browserControls, isControlDisabled, handleBrowserControlClick, goBack, goForward, reload, goHome, handleNavItemClick, updateViewports, updateCache } from './AppHeader.logic.js';

const menu = ref(false);
const activeGroup = ref<string | null>(null);
const activator = ref<Element | undefined>();
const menuItems = ref<NavItem[]>([]);
const canGoBack = ref(false);
const canGoForward = ref(false);

// Fallback delay (ms) to open the menu if the IPC event never fires.
const RESIZE_FALLBACK_MS = 200;

let closeTimeout = -1;
let resizeFallback = -1;
let pendingOpen: PendingNavOpen | null = null;

watch(menu, isOpen => {
	if (!isOpen) {
		delayedClose();
		activeGroup.value = null;
	}
});

function openMenu(targetEl: Element, group: NavGroup): void {
	activator.value = targetEl;
	menuItems.value = group.submenu;
	activeGroup.value = group.name;
	menu.value = true;
}

function triggerOpen(): void {
	if (!pendingOpen) { return; }
	window.clearTimeout(resizeFallback);
	openMenu(pendingOpen.target, pendingOpen.group);
	pendingOpen = null;
}

onMounted(() => {
	window.eyas?.receive(`ui-shown` as ChannelName, triggerOpen);
	window.eyas?.receive(`navigation-state-updated` as ChannelName, (data: unknown) => {
		const payload = data as NavigationStatePayload;
		canGoBack.value = payload.canGoBack;
		canGoForward.value = payload.canGoForward;

		if (payload.viewports && payload.currentViewport) {
			updateViewports(payload.viewports, payload.currentViewport[0], payload.currentViewport[1]);
		}

		if (payload.cacheSize !== undefined && payload.sessionAge !== undefined) {
			updateCache(payload.cacheSize, payload.sessionAge, !!payload.isDev);
		}
	});
});

function activate(event: NavActivateEvent, group: NavGroup): void {
	const target = event.currentTarget;

	if (menu.value) {
		if (activator.value === target) {
			menu.value = false;
			return;
		}

		// Layer already at full height — glide to the new item immediately
		openMenu(target, group);
	} else {
		// Layer is at header height. Request expansion, then wait for the IPC
		// event that confirms setBounds has propagated.
		pendingOpen = { target, group };
		window.eyas?.send(`show-ui` as ChannelName);

		window.clearTimeout(resizeFallback);
		resizeFallback = window.setTimeout(triggerOpen, RESIZE_FALLBACK_MS);
	}
}

function onMouseEnter(event: NavActivateEvent, group: NavGroup): void {
	if (menu.value && activator.value !== event.currentTarget) {
		openMenu(event.currentTarget, group);
	}
}

function onItemClick(item: NavItem): void {
	if (item.click) {
		item.click();
	} else {
		handleNavItemClick(item.value);
	}

	if (!item.submenu) {
		menu.value = false;
	}
}

function delayedClose(): void {
	const modalsStore = useModalsStore();
	window.clearTimeout(closeTimeout);

	// Wait for the menu's close transition to complete (~250-300ms)
	// before shrinking the layer, provided no modals have opened.
	closeTimeout = window.setTimeout(() => {
		if (!menu.value && !modalsStore.hasVisibleModals) {
			window.eyas?.send(`hide-ui` as ChannelName);
		}
	}, 300);
}

// expose for testing
defineExpose({
	menu,
	menuItems,
	activator,
	canGoBack,
	canGoForward,
	activate,
	onMouseEnter,
	onItemClick,
	onBrowserControlClick: handleBrowserControlClick,
	goBack,
	goForward,
	reload,
	goHome
});
</script>

<style scoped>
.menu-logo {
	height: 1.5em;
	width: 1.5em;
}

.menu-shortcut {
	font-size: 0.65rem !important;
	opacity: 0.6 !important;
}

.non-actionable {
	cursor: default !important;
	pointer-events: none;
}

.non-actionable:hover {
	background: transparent !important;
}

.v-btn--active {
	background-color: rgba(var(--v-theme-primary), 0.1) !important;
	color: rgb(var(--v-theme-primary)) !important;
}

.v-list-item--active {
	background-color: rgba(var(--v-theme-primary), 0.1) !important;
	color: rgb(var(--v-theme-primary)) !important;
}
</style>
