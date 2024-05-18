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
						<v-col
							v-for="(domain, index) in domains"
							:key="index"
						>
							<v-btn
								class="-py-5"
								block
								size="large"
								:stacked="$vuetify.display.smAndUp"
								v-tooltip:bottom="domain.url"
								@click="choose(domain)"
							>
								<template v-slot:prepend>
									<v-icon size="40">mdi-database</v-icon>
								</template>

								<p>{{ domain.title }}</p>
							</v-btn>
						</v-col>
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
		window.eventBridge?.receive(`show-environment-modal`, domains => {
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