<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-h6 mb-10">Select Test Environment</p>

				<v-sheet>
					<v-row>
						<v-btn
							v-for="domain in domains"
							class="mx-3 py-10"
							stacked
							@click="choose(domain)"
							v-tooltip:bottom="domain.url"
						>
							<v-icon size="40">mdi-database</v-icon>
							<p>{{ domain.title }}</p>
						</v-btn>
					</v-row>
				</v-sheet>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data: () => ({
		visible: false,
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