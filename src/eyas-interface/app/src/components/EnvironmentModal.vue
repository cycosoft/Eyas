<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
	>
		<v-card>
			<v-card-text>
				Choose an environment to test in:
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data: () => ({
		visible: false,
		domains: []
	}),

	mounted() {
		// Listen for messages from the main process
		window.eventBridge?.receive(`choose-environment`, domains => {
			this.domains = domains;
			this.visible = true;
		});
	},

	methods: {
		choose(domain) {
			window.eventBridge?.send(`select-environment`, domain);
		}
	}
}
</script>