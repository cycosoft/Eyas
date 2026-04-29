<template>
	<v-app-bar
		density="compact"
		data-qa="app-header"
	>
		<v-btn
			v-for="group in groups"
			:key="group.name"
			class="px-3"
			rounded="xs"
			append-icon="mdi-chevron-down"
			:data-qa="`btn-nav-group-${group.name.toLowerCase()}`"
			@click="activate($event, group)"
			@mouseenter="onMouseEnter($event, group)"
		>
			<v-img
				v-if="group.logo"
				:src="group.logo"
				class="menu-logo mr-n1"
			/>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<span
				v-else
				v-html="getMnemonicName(group)"
			/>
		</v-btn>
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
	>
		<v-list
			class="py-1"
			density="compact"
			rounded="lg"
			border
		>
			<v-list-item
				v-for="item in menuItems"
				:key="item.value"
				slim
				:value="item.value"
				:prepend-icon="item.icon"
				:color="item.color"
				:class="{ [`text-${item.color}`]: item.color }"
				data-qa="btn-nav-item"
				@click="onItemClick(item)"
			>
				<div class="d-flex align-center w-100">
					<!-- eslint-disable-next-line vue/no-v-html -->
					<span
						class="flex-grow-1"
						v-html="getMnemonicName(item)"
					/>
					<span
						v-if="item.shortcut"
						class="text-disabled ml-4 menu-shortcut"
					>
						{{ item.shortcut }}
					</span>
				</div>
			</v-list-item>
		</v-list>
	</v-menu>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import useModalsStore from '@/stores/modals.js';
import type { NavGroup, NavItem, NavActivateEvent, PendingNavOpen } from '@/types/nav.js';
import type { ChannelName } from '@registry/primitives.js';
import { groups, getMnemonicName } from './AppHeader.logic.js';

const menu = ref(false);
const activator = ref<Element | undefined>();
const menuItems = ref<NavItem[]>([]);

// Fallback delay (ms) to open the menu if the IPC event never fires.
const RESIZE_FALLBACK_MS = 200;

let closeTimeout = -1;
let resizeFallback = -1;
let pendingOpen: PendingNavOpen | null = null;

watch(menu, isOpen => {
	if (!isOpen) {
		delayedClose();
	}
});

function openMenu(targetEl: Element, group: NavGroup): void {
	activator.value = targetEl;
	menuItems.value = group.submenu;
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
	if (item.value === `about`) {
		window.eyas?.send(`show-about` as ChannelName);
	}

	if (item.value === `test-server`) {
		window.eyas?.send(`show-test-server-setup` as ChannelName);
	}

	if (item.value === `settings`) {
		window.eyas?.send(`show-settings` as ChannelName);
	}

	if (item.value === `whats-new`) {
		window.eyas?.send(`show-whats-new` as ChannelName);
	}

	if (item.value === `exit`) {
		window.eyas?.send(`request-exit` as ChannelName);
	}

	menu.value = false;
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
defineExpose({ menu, menuItems, activator, activate, onMouseEnter, onItemClick });
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
</style>
