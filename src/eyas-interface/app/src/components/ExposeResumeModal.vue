<template>
	<ModalWrapper v-model="visible">
		<v-card class="pa-3">
			<v-card-title class="text-h6" data-qa="expose-resume-title">Expose Test Auto-Shutdown</v-card-title>
			<v-card-text>
				<p class="mb-4">The expose server has automatically shut down after {{ duration }}.</p>
				<p>Would you like to resume serving the test for another {{ duration }} with the same settings?</p>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn data-qa="btn-close-resume" @click="close">
					No, Close
				</v-btn>
				<v-btn color="primary" data-qa="btn-confirm-resume" @click="resume">
					Yes, Resume
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script>
import ModalWrapper from '@/components/ModalWrapper.vue';

const defaults = {
	visible: false,
	duration: `30 minutes`
};

export default {
	components: {
		ModalWrapper
	},

	data: () => ({ ...defaults }),

	mounted() {
		window.eyas?.receive(`show-expose-resume-modal`, (duration) => {
			this.duration = duration || `30 minutes`;
			this.visible = true;
		});
	},

	methods: {
		close() {
			this.visible = false;
			Object.assign(this.$data, defaults);
		},

		resume() {
			window.eyas?.send(`expose-resume-confirm`);
			this.visible = false;
			Object.assign(this.$data, defaults);
		}
	}
};
</script>
