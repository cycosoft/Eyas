<template>
	<ModalBackground :model-value="modelValue">
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
import ModalBackground from '@/components/ModalBackground.vue';

export default {
	components: {
		ModalBackground
	},

	props: {
		modelValue: Boolean
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