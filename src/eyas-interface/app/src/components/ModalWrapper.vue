<template>
	<ModalBackground :model-value="visible">
		<v-dialog
			v-model="visible"
			width="auto"
			persistent
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

	data: () => ({
		visible: false
	}),

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