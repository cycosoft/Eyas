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

				<v-btn
					icon
					density="compact"
					variant="text"
					class="mr-1"
					data-qa="btn-broadcast"
					:title="updateInfo.title"
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
import { onMounted, watch, toRefs } from 'vue';
import type { ChannelName } from '@registry/primitives.js';
import {
	groups,
	state,
	browserControls,
	isControlDisabled,
	handleBrowserControlClick,
	goBack,
	goForward,
	reload,
	goHome,
	handleBroadcastClick,
	activate,
	onMouseEnter,
	onItemClick,
	delayedClose,
	triggerOpen,
	updateInfo,
	handleNavigationUpdate,
	handleUpdateStatusUpdate
} from './AppHeader.logic.js';

const { menu, activator, canGoBack, canGoForward, updateStatus } = toRefs(state);

watch(menu, isOpen => {
	if (!isOpen) {
		delayedClose();
		state.activeGroup = null;
	}
});

onMounted(() => {
	window.eyas?.receive(`ui-shown` as ChannelName, triggerOpen);
	window.eyas?.receive(`navigation-state-updated` as ChannelName, handleNavigationUpdate);
	window.eyas?.receive(`update-status-updated` as ChannelName, handleUpdateStatusUpdate);
});

// expose for testing
defineExpose({
	menu,
	menuItems: toRefs(state).menuItems,
	activator: toRefs(state).activator,
	canGoBack,
	canGoForward,
	activate,
	onMouseEnter,
	onItemClick,
	onBrowserControlClick: handleBrowserControlClick,
	goBack,
	goForward,
	reload,
	goHome,
	handleBroadcastClick
});
</script>

<style scoped>
.menu-logo { height: 1.5em; width: 1.5em; }
.menu-shortcut { font-size: 0.65rem !important; opacity: 0.6 !important; }
.non-actionable { cursor: default !important; pointer-events: none; }
.v-btn--active, .v-list-item--active {
	background-color: rgba(var(--v-theme-primary), 0.1) !important;
	color: rgb(var(--v-theme-primary)) !important;
}



.blink-animation {
	animation: blink 1s infinite;
}

@keyframes blink {
	0% { opacity: 1; }
	50% { opacity: 0.3; }
	100% { opacity: 1; }
}
</style>
