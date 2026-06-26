<template>
	<ModalBackground
		:model-value="modelValue"
		:content-visible="backgroundContentVisible"
		@after-leave="hideUi"
	>
		<v-dialog
			:model-value="modelValue"
			:width="dialogWidth"
			:min-width="calculatedMinWidth"
			scrollable
			persistent
			v-bind="$attrs"
			:scrim="false"
			@after-enter="pinDialogWidth"
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
import type { ModalWrapperProps, ModalWrapperEmits } from '@registry/components.js';
import type { ModalId, IsVisible, ViewportWidth, ChannelName, LabelString } from '@registry/primitives.js';

const props = withDefaults(defineProps<ModalWrapperProps>(), {
	type: `modal`,
	minWidth: undefined
});

const emit = defineEmits<ModalWrapperEmits>();

const id = ref<ModalId>(window.crypto.randomUUID() as ModalId);
const dialogWidthState = ref<ViewportWidth | `fit-content` | undefined>(`fit-content`);

const dialogWidth = computed((): ViewportWidth | `60vw` | `fit-content` | undefined => {
	if (props.type === `modal`) {
		return `60vw`;
	}
	return dialogWidthState.value;
});

const backgroundContentVisible = computed((): IsVisible => {
	return ModalStore().lastOpenedById === id.value;
});

const calculatedMinWidth = computed((): ViewportWidth | LabelString | undefined => {
	if (props.minWidth !== undefined) {
		return Number(props.minWidth) as ViewportWidth;
	}
	return props.type === `modal` ? `60vw` as LabelString : undefined;
});

const trackModalState = (isTrue: IsVisible): void => {
	if (isTrue) {
		// reset width to the initial state so it can calculate the new initial width
		dialogWidthState.value = `fit-content`;
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
	// hide the UI if there are no other dialogs open. Triggered by the
	// ModalBackground's @after-leave hook to ensure the overlay is fully gone.
	if (!ModalStore().hasVisibleModals) {
		window.eyas?.send(`hide-ui` as ChannelName);
	}
};

const pinDialogWidth = (): void => {
	if (props.type === `modal`) { return; }

	// Find the currently active modal's card natively
	const activeModalContent = document.querySelector(`[data-modal-id="${id.value}"] .v-card`) as HTMLElement;

	if (activeModalContent) {
		// set the width of the dialog + 1 to round up and prevent content jumping
		dialogWidthState.value = activeModalContent.offsetWidth + 1;
	}
};

watch(() => ModalStore().closeAllCounter, () => {
	// respond to the global close-all broadcast dispatched once from App.vue
	emit(`update:modelValue`, false);
});

onMounted(() => {
	console.warn(`[ModalWrapper] This component is deprecated. Use EyasModal instead.`);
});

defineExpose({
	pinDialogWidth,
	dialogWidth,
	calculatedMinWidth,
	hideUi
});
</script>

<style scoped>
.modal-wrapper__content {
	display: contents;
}

/* Enforce consistent modal body scrolling across all Eyas modals */
.modal-wrapper__content :deep(.v-card) {
	display: flex !important;
	flex-direction: column !important;
	max-height: 90vh !important;
	overflow: hidden !important;
}

.modal-wrapper__content :deep(.v-card-text) {
	flex-grow: 1 !important;
	overflow-y: auto !important;
}
</style>