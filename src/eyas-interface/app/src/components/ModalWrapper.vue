<template>
	<ModalBackground
		:model-value="modelValue"
		:content-visible="backgroundContentVisible"
	>
		<v-dialog
			:model-value="modelValue"
			width="auto"
			persistent
			v-bind="$attrs"
			:scrim="false"
			@after-leave="hideUi"
		>
			<slot />
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
		id: window.crypto.randomUUID() // generate a unique ID for this modal
	}),

	computed: {
		backgroundContentVisible () {
			return ModalStore().lastOpenedById === this.id;
		}
	},

	watch: {
		modelValue(isTrue) {
			if(isTrue) {
				// track this modal as the last opened modal
				ModalStore().track(this.id);
			} else {
				// remove the modal from the store
				ModalStore().untrack(this.id);
			}
		}
	},

	methods: {
		hideUi() {
			// hide the UI if there are no other dialogs open
			if(document.querySelectorAll(`.v-dialog`).length <= 1) {
				window.eventBridge?.send(`hide-ui`);
			}
		}
	}
};
</script>