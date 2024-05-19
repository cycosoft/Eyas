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
								v-tooltip:bottom="tooltip(domain)"
								@click="choose(domain.url)"
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
		domains: []
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
			window.eventBridge?.send(`environment-selected`, domain);
			this.visible = false;
		},

		tooltip(domain) {
			const message = `Button title not set`;
			return domain.url === domain.title ? message : domain.url;
		}
	}
}
</script>