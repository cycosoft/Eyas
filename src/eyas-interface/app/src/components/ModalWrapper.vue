<template>
	<ModalBackground
		:model-value="modelValue"
		:content-visible="backgroundContentVisible"
	>
		<v-dialog
			:model-value="modelValue"
			:width="dialogWidth"
			persistent
			v-bind="$attrs"
			:scrim="false"
			@after-enter="pinDialogWidth"
			@after-leave="hideUi"
		>
			<div ref="modalContent" style="display: contents;">
				<slot />
			</div>
		</v-dialog>
	</ModalBackground>
</template>

<script>
import ModalStore from '@/stores/modals';
import ModalBackground from '@/components/ModalBackground.vue';

export default {
	components: {
		ModalBackground
	},

	props: {
		modelValue: Boolean
	},

	data: () => ({
		id: window.crypto.randomUUID(), // generate a unique ID for this modal
		dialogWidth: 'auto'
	}),

	computed: {
		backgroundContentVisible () {
			return ModalStore().lastOpenedById === this.id;
		}
	},

	watch: {
		modelValue: {
			immediate: true, // must be immediate to track the initial state AND when the modal is closed
			handler: `trackModalState`
		}
	},

	mounted() {
		// listen for global events to close all the modals
		window.eyas?.receive(`close-modals`, () => {
			// tell the parent to update the model value
			this.$emit(`update:modelValue`, false);
		});
	},

	methods: {
		trackModalState(isTrue) {
			if(isTrue) {
				// reset width to auto so it can calculate the new initial width
				this.dialogWidth = 'auto';
				// track this modal as the last opened modal
				ModalStore().track(this.id);
			} else {
				// remove the modal from the store
				ModalStore().untrack(this.id);
			}
		},

		hideUi() {
			// hide the UI if there are no other dialogs open
			if(document.querySelectorAll(`.v-dialog`).length <= 1) {
				window.eyas?.send(`hide-ui`);
			}
		},

		pinDialogWidth() {
			// Find the currently active modal's card natively through Vue Template Refs
			const activeModalContent = this.$refs.modalContent?.firstElementChild;

			if (activeModalContent) {
				// set the width of the dialog + 1 to round up and prevent content jumping
				this.dialogWidth = activeModalContent.offsetWidth + 1;
			}
		}
	}
};
</script>