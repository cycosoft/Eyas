<template>
	<ModalBackground
		:model-value="modelValue"
		:content-visible="backgroundContentVisible"
	>
		<v-dialog
			:model-value="modelValue"
			:width="dialogWidth"
			:min-width="calculatedMinWidth"
			max-height="90vh"
			scrollable
			persistent
			v-bind="$attrs"
			:scrim="false"
			@after-enter="pinDialogWidth"
			@after-leave="hideUi"
		>
			<div :data-modal-id="id" class="modal-wrapper__content">
				<slot />
			</div>
		</v-dialog>
	</ModalBackground>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import ModalStore from '@/stores/modals.js';
import ModalBackground from '@/components/ModalBackground.vue';
import type { ModalWrapperProps, ModalWrapperEmits } from '@/../../../types/components.js';
import type { ModalId, ChannelName, IsVisible, ViewportWidth } from '@/../../../types/primitives.js';

const props = withDefaults(defineProps<ModalWrapperProps>(), {
	type: `modal`,
	minWidth: undefined
});

const emit = defineEmits<ModalWrapperEmits>();

const id = ref<ModalId>(window.crypto.randomUUID() as ModalId);
const dialogWidth = ref<ViewportWidth | `auto`>(`auto`);

const backgroundContentVisible = computed((): IsVisible => {
	return ModalStore().lastOpenedById === id.value;
});

const calculatedMinWidth = computed((): ViewportWidth | undefined => {
	if (props.minWidth !== undefined) {
		return Number(props.minWidth) as ViewportWidth;
	}
	return props.type === `modal` ? 500 as ViewportWidth : undefined;
});

const trackModalState = (isTrue: IsVisible): void => {
	if (isTrue) {
		// reset width to the initial auto state so it can calculate the new initial width
		dialogWidth.value = `auto`;
		// track this modal as the last opened modal
		ModalStore().track(id.value);
	} else {
		// remove the modal from the store
		ModalStore().untrack(id.value);
	}
};

watch(() => props.modelValue, newValue => {
	trackModalState(newValue);
}, { immediate: true });

const hideUi = (): void => {
	// hide the UI if there are no other dialogs open
	if (document.querySelectorAll(`.v-dialog`).length <= 1) {
		window.eyas?.send(`hide-ui` as ChannelName);
	}
};

const pinDialogWidth = (): void => {
	// Find the currently active modal's card natively
	const activeModalContent = document.querySelector(`[data-modal-id="${id.value}"] .v-card`) as HTMLElement;

	if (activeModalContent) {
		// set the width of the dialog + 1 to round up and prevent content jumping
		dialogWidth.value = activeModalContent.offsetWidth + 1;
	}
};

onMounted(() => {
	// listen for global events to close all the modals
	window.eyas?.receive(`close-modals` as ChannelName, () => {
		// tell the parent to update the model value
		emit(`update:modelValue`, false);
	});
});

defineExpose({
	pinDialogWidth,
	dialogWidth,
	calculatedMinWidth
});
</script>

<style scoped>
.modal-wrapper__content {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

/* Enforce consistent modal body scrolling across all Eyas modals */
.modal-wrapper__content :deep(.v-card) {
	display: flex !important;
	flex-direction: column !important;
	max-height: 100% !important;
	overflow: hidden !important;
}

.modal-wrapper__content :deep(.v-card-text) {
	flex-grow: 1 !important;
	overflow-y: auto !important;
}
</style>