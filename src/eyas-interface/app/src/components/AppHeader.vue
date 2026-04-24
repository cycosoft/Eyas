<template>
	<v-app-bar density="compact" data-qa="app-header">
		<v-btn
			v-for="group in groups"
			:key="group.name"
			:text="group.name"
			append-icon="mdi-chevron-down"
			@focus="activate($event, group)"
			@mouseenter="activate($event, group)"
			@mouseleave="delayedClose()"
		/>
	</v-app-bar>

	<v-menu
		v-model="menu"
		:activator="activator"
		:content-class="menuMoving ? `menu-move-transition` : ``"
		location="bottom end"
		:offset="4"
		:viewport-margin="0"
	>
		<v-list
			:items="menuItems"
			class="py-1"
			density="compact"
			rounded="lg"
			border
			@mouseenter="onListEnter()"
			@mouseleave="delayedClose()"
		>
			<template #append>
				<v-icon icon="mdi-arrow-top-right" />
			</template>
		</v-list>
	</v-menu>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { NavGroup, NavItem, NavActivateEvent, PendingNavOpen } from '@/types/nav.js';
import type { ChannelName } from '@registry/primitives.js';

const menu = ref(false);
const activator = ref<Element | undefined>();
const menuItems = ref<NavItem[]>([]);
const menuMoving = ref(false);

// placeholder groups — replace with real application menus when ready
const groups: NavGroup[] = [
	{
		name: `File`,
		submenu: [
			{ title: `Open Test`, value: `open-test` },
			{ title: `Recent Tests`, value: `recent-tests` },
			{ title: `Close`, value: `close` }
		]
	},
	{
		name: `View`,
		submenu: [
			{ title: `Zoom In`, value: `zoom-in` },
			{ title: `Zoom Out`, value: `zoom-out` },
			{ title: `Reset Zoom`, value: `reset-zoom` },
			{ title: `Full Screen`, value: `full-screen` }
		]
	},
	{
		name: `Tools`,
		submenu: [
			{ title: `Settings`, value: `settings` },
			{ title: `Test Server`, value: `test-server` },
			{ title: `DevTools`, value: `devtools` }
		]
	},
	{
		name: `Help`,
		submenu: [
			{ title: `What's New`, value: `whats-new` },
			{ title: `Documentation`, value: `docs` },
			{ title: `Report an Issue`, value: `report-issue` }
		]
	}
];

// Fallback delay (ms) to open the menu if the IPC event never fires.
const RESIZE_FALLBACK_MS = 200;

let closeTimeout = -1;
let movingTimeout = -1;
let resizeFallback = -1;
let pendingOpen: PendingNavOpen | null = null;

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
	clearTimeout(closeTimeout);
	clearTimeout(movingTimeout);

	const target = event.currentTarget;

	if (menu.value) {
		// Layer already at full height — glide to the new item immediately
		menuMoving.value = true;
		movingTimeout = window.setTimeout(() => { menuMoving.value = false; }, 300);
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

function onListEnter(): void {
	clearTimeout(closeTimeout);
}

function delayedClose(): void {
	clearTimeout(closeTimeout);
	closeTimeout = window.setTimeout(() => {
		menu.value = false;
		// layer is no longer needed at full height — collapse back to header
		window.eyas?.send(`hide-ui` as ChannelName);
	}, 600);
}

// expose for testing
defineExpose({ menu, menuItems, menuMoving, activator, activate, onListEnter, delayedClose });
</script>

<style>
.menu-move-transition {
	transition: 0.2s ease-out;
	transition-property: left, top;
}
</style>
