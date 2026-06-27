<template>
	<ModalBackground
		:model-value="modelValue"
		:content-visible="backgroundContentVisible"
		@after-leave="hideUi"
	>
		<v-dialog
			:model-value="modelValue"
			max-width="850"
			width="65vw"
			min-width="320"
			persistent
			:scrim="false"
			@update:model-value="emit(`update:modelValue`, $event)"
		>
			<v-card class="eyas-modal">
				<div v-if="$slots.title" class="eyas-modal__header">
					<slot name="title" />
				</div>

				<v-card-text class="eyas-modal__body">
					<slot />
				</v-card-text>

				<v-card-actions v-if="$slots.actions" class="eyas-modal__actions">
					<slot name="actions" />
				</v-card-actions>
			</v-card>
		</v-dialog>
	</ModalBackground>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ModalStore from '@/stores/modals.js';
import ModalBackground from '@/components/ModalBackground.vue';
import type { EyasModalProps, EyasModalEmits } from '@registry/components.js';
import type { ModalId, IsVisible, ChannelName } from '@registry/primitives.js';

const props = defineProps<EyasModalProps>();

const emit = defineEmits<EyasModalEmits>();

const id = ref<ModalId>(window.crypto.randomUUID() as ModalId);

const backgroundContentVisible = computed((): IsVisible => {
	return ModalStore().lastOpenedById === id.value;
});

watch(() => props.modelValue, (isOpen: IsVisible) => {
	if (isOpen) {
		ModalStore().track(id.value);
	} else {
		ModalStore().untrack(id.value);
	}
}, { immediate: true });

const hideUi = (): void => {
	// hide the UI if there are no other dialogs open. Triggered by the
	// ModalBackground's @after-leave hook to ensure the overlay is fully gone.
	if (!ModalStore().hasVisibleModals) {
		window.eyas?.send(`hide-ui` as ChannelName);
	}
};

watch(() => ModalStore().closeAllCounter, () => {
	emit(`update:modelValue`, false);
});
</script>

<style scoped>
.eyas-modal {
	/* Design system tokens */
	--modal-primary: #58A1D6;
	--modal-primary-rgb: 88, 161, 214;
	--modal-background: #f8f9fa;
	--modal-surface: #ffffff;
	--modal-on-surface-rgb: 25, 28, 30;

	/* Glass panel aesthetic */
	background: var(--modal-background) !important;
	border: 1px solid rgba(255, 255, 255, 0.8) !important;
	box-shadow: 0 24px 60px rgba(var(--modal-on-surface-rgb), 0.12) !important;
	border-radius: 16px !important;
	overflow: hidden !important;

	/* Flex column so header/body/actions stack and body scrolls */
	display: flex !important;
	flex-direction: column !important;
	max-height: 90vh !important;
}

.eyas-modal__header {
	flex-shrink: 0;
	padding: 2rem 2rem 1.5rem;
	text-align: center;
}

.eyas-modal__body {
	flex-grow: 1 !important;
	overflow-y: auto !important;
	padding: 0 2rem 1.5rem !important;
}

.eyas-modal__body::-webkit-scrollbar {
	width: 4px;
}

.eyas-modal__body::-webkit-scrollbar-track {
	background: transparent;
}

.eyas-modal__body::-webkit-scrollbar-thumb {
	background: #e2e8f0;
	border-radius: 10px;
}

.eyas-modal__body::-webkit-scrollbar-thumb:hover {
	background: #cbd5e1;
}

.eyas-modal__actions {
	flex-shrink: 0;
	padding: 0 2rem 1.5rem !important;
}
</style>
