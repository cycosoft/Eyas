<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
	>
		<v-card>
			<v-card-text>
				<p class="font-weight-black text-center text-h6 mb-3">Select Test Environment</p>

				<v-btn
					v-for="domain in domains"
					stacked
					prepend-icon="mdi-database-outline"
					class="mx-5"
				>
					{{ domain.title }}
				</v-btn>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data: () => ({
		visible: true,
		domains: [
			{ url: `dev.eyas.cycosoft.com`, title: `Development`, port: 3000 },
			{ url: `staging.eyas.cycosoft.com`, title: `Staging` },
			{ url: `eyas.cycosoft.com`, title: `Production` }
		]
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