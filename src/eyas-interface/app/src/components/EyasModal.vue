<template>
	<ModalBackground
		:model-value="modelValue"
		:content-visible="backgroundContentVisible"
		:scrim="showScrim"
		@after-leave="hideUi"
	>
		<v-dialog
			:model-value="modelValue"
			:max-width="props.mode === `panel` ? undefined : 850"
			:width="props.mode === `panel` ? undefined : '65vw'"
			:min-width="props.mode === `panel` ? undefined : 320"
			:content-class="props.mode === `panel` ? panelContentClass : undefined"
			:style="props.mode === `panel` ? panelStyle : undefined"
			:persistent="!props.closeOnEscape"
			:scrim="false"
			@update:model-value="emit(`update:modelValue`, $event)"
		>
			<v-card
				class="eyas-modal"
				:class="{ 'eyas-modal--panel': props.mode === `panel`, 'eyas-modal--faded': fadeDuringPlayback }"
				data-qa="eyas-modal-card"
			>
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
import useRecordingStore from '@/stores/recording.js';
import ModalBackground from '@/components/ModalBackground.vue';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import type { EyasModalProps, EyasModalEmits } from '@registry/components.js';
import type { ModalId, IsVisible, ChannelName, ElementClassList } from '@registry/primitives.js';

const props = withDefaults(defineProps<EyasModalProps>(), {
	mode: `modal`,
	closeOnEscape: true
});

const emit = defineEmits<EyasModalEmits>();

const id = ref<ModalId>(window.crypto.randomUUID() as ModalId);
const recordingStore = useRecordingStore();

const backgroundContentVisible = computed((): IsVisible => {
	return ModalStore().lastOpenedById === id.value;
});

const showScrim = computed((): IsVisible => {
	// a panel stays out of the way of an in-progress replay rather than dimming it, so the tester can still watch the run happen underneath
	if (props.mode !== `panel`) { return true; }
	return !recordingStore.isPlaying;
});

// the panel dims/narrows out of the way during a replay instead, restoring on hover so the tester can still glance at it without moving it
const fadeDuringPlayback = computed((): IsVisible => {
	return props.mode === `panel` && recordingStore.isPlaying;
});

// Narrows the panel alongside the opacity fade above; :hover in CSS restores width and opacity together.
const panelContentClass = computed((): ElementClassList => {
	return fadeDuringPlayback.value ? [`eyas-modal-panel-content`, `eyas-modal-panel-content--faded`] : [`eyas-modal-panel-content`];
});

const panelStyle = {
	'--eyas-panel-top': `calc(${EYAS_HEADER_HEIGHT}px + 1rem)`
};

watch(() => props.modelValue, (isOpen: IsVisible) => {
	if (isOpen) {
		ModalStore().track(id.value);
	} else {
		ModalStore().untrack(id.value);
	}
}, { immediate: true });

const hideUi = (): void => {
	// hide the UI if there are no other dialogs open. Triggered by ModalBackground's @after-leave hook.
	// A replay in progress must stay visible even with every dialog closed (e.g. click-outside closed
	// the panel) - only the run itself stopping (see the isPlaying watch below) may hide the layer then.
	if (!ModalStore().hasVisibleModals && !recordingStore.isPlaying) {
		window.eyas?.send(`hide-ui` as ChannelName);
	}
};

// Catches the case hideUi's own check above bails on: a replay finishing while every dialog is
// already closed, which needs its own trigger to hide the layer once the run is actually done.
watch(() => recordingStore.isPlaying, (isPlaying: IsVisible) => {
	if (!isPlaying && !ModalStore().hasVisibleModals) {
		window.eyas?.send(`hide-ui` as ChannelName);
	}
});

watch(() => ModalStore().closeAllCounter, () => {
	emit(`update:modelValue`, false);
});
</script>

<style scoped>
.eyas-modal {
	/* Design system tokens */
	--modal-primary: #58A1D6;
	--modal-primary-rgb: 88, 161, 214;
	--modal-background: #f8f8f8;
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

.eyas-modal--panel {
	/* .eyas-modal-panel-content (below) is position:fixed with both top and bottom set, giving it a
	   real bounded height — height:100% here lets the card fill that box instead of growing with its
	   own content, so .eyas-modal__body's overflow-y:auto has an actual overflow to scroll. */
	max-height: none !important;
	height: 100%;
	width: 100%;
}

.eyas-modal--faded {
	opacity: 0.4;
	transition: opacity 0.15s ease;
}

.eyas-modal--faded:hover {
	opacity: 1;
}

:deep(.eyas-modal-panel-content) {
	position: fixed !important;
	top: var(--eyas-panel-top);
	right: 1rem;
	bottom: 1rem;
	left: auto !important;
	transform: none !important;
	width: 380px;
	max-width: 380px;
	transition: width 0.15s ease, max-width 0.15s ease;
}

:deep(.eyas-modal-panel-content--faded) { width: 100px; max-width: 100px; }
:deep(.eyas-modal-panel-content--faded:hover) { width: 380px; max-width: 380px; }

.eyas-modal__header {
	flex-shrink: 0;
	padding: 2rem 2rem 1.5rem;
	text-align: center;
}

.eyas-modal--panel .eyas-modal__header {
	padding: 1rem 1rem 0.75rem;
	text-align: left;
}

.eyas-modal__body {
	flex-grow: 1 !important;
	overflow-y: auto !important;
	padding: 0 2rem 1.5rem !important;
}

.eyas-modal--panel .eyas-modal__body {
	padding: 0 1rem 1rem !important;
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
