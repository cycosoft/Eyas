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
import { ref } from 'vue';
import type { NavGroup, NavItem, NavActivateEvent } from '@/types/nav.js';
import type { ChannelName } from '@registry/primitives.js';

const menu = ref(false);
const activator = ref<Element | undefined>();
const menuItems = ref<NavItem[]>([]);
const menuMoving = ref(false);

// placeholder groups — replace with real application menus when ready
const groups: NavGroup[] = [
	{
		name: `Home`,
		submenu: [
			{ title: `Welcome`, value: `welcome` },
			{ title: `Updates`, value: `latest` }
		]
	},
	{
		name: `About`,
		submenu: [
			{ title: `What's New`, value: `whats-new` },
			{ title: `Settings`, value: `settings` }
		]
	}
];

let closeTimeout = -1;
let movingTimeout = -1;

function activate(event: NavActivateEvent, group: NavGroup): void {
	clearTimeout(closeTimeout);
	clearTimeout(movingTimeout);

	if (menu.value) {
		menuMoving.value = true;
		movingTimeout = window.setTimeout(() => { menuMoving.value = false; }, 300);
	} else {
		// layer was not expanded yet — request the main process to expand it
		window.eyas?.send(`show-ui` as ChannelName);
	}

	activator.value = event.currentTarget;
	menuItems.value = group.submenu;
	menu.value = true;
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
