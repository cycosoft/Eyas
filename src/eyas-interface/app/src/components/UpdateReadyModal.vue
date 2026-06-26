<template>
	<ModalWrapper
		v-model="visible"
		type="dialog"
		@keyup.esc="cancel"
		@keyup.enter="update"
		@keyup.u="update"
	>
		<v-card max-width="450">
			<v-card-title class="text-h5">
				Update Ready to Install
			</v-card-title>

			<v-card-text data-qa="update-ready-modal-text">
				A new version of Eyas has been downloaded and is ready to install.
			</v-card-text>

			<v-card-actions class="mt-5">
				<v-btn data-qa="btn-update-cancel" @click="cancel">
					Cancel
				</v-btn>

				<div class="flex-grow-1" />

				<v-btn-group v-if="showLaterDropdown" color="primary" variant="elevated">
					<v-btn
						:loading="updating"
						data-qa="btn-update-now"
						@click="update"
					>
						Close & <u>U</u>pdate
					</v-btn>
					<v-menu>
						<template #activator="{ props }">
							<v-btn
								v-bind="props"
								icon="mdi-menu-down"
								data-qa="btn-update-menu"
							/>
						</template>
						<v-list density="compact">
							<v-list-item data-qa="btn-update-later" @click="later">
								<v-list-item-title>Later</v-list-item-title>
							</v-list-item>
						</v-list>
					</v-menu>
				</v-btn-group>

				<v-btn
					v-else
					color="primary"
					variant="elevated"
					:loading="updating"
					data-qa="btn-update-now"
					@click="update"
				>
					Close & <u>U</u>pdate
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import useSettingsStore from '@/stores/settings.js';
import type { ChannelName, IsVisible, IsPending, IsExitFlow } from '@registry/primitives.js';

const visible = ref<IsVisible>(false);
const updating = ref<IsPending>(false);
const exitFlow = ref<IsExitFlow>(false);
const settingsStore = useSettingsStore();

const showLaterDropdown = computed(() => exitFlow.value && !!(settingsStore.appSettings.allowBypassUpdates));

const update = (): void => {
	updating.value = true;
	window.eyas?.send(`install-update` as ChannelName);
};

const cancel = (): void => {
	visible.value = false;
};

const later = (): void => {
	if (exitFlow.value) {
		window.eyas?.send(`app-exit` as ChannelName);
	} else {
		visible.value = false;
	}
};

onMounted(() => {
	// Listen for messages from the main process
	window.eyas?.receive(`show-update-ready-modal` as ChannelName, (value: IsVisible, isExitFlow?: IsExitFlow) => {
		visible.value = value;
		exitFlow.value = !!isExitFlow;
	});
});
</script>
