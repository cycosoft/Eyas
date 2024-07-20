<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
		data-qa="environment-modal"
		:scrim="false"
		@after-leave="hideUi"
		@keyup="environmentHotkey"
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
							<v-badge
								color="red-lighten-2"
								:content="index + 1"
								location="bottom right"
							>
								<v-btn
									class="-py-5"
									block
									size="large"
									:stacked="$vuetify.display.smAndUp"
									:loading="loadingIndex === index"
									v-tooltip:bottom="tooltip(domain)"
									@click="choose(domain.url, index)"
								>
									<template v-slot:prepend>
										<v-icon size="40">mdi-database</v-icon>
									</template>

									<p>{{ domain.title }}</p>
								</v-btn>
							</v-badge>
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
		domains: [],
		loadingIndex: -1
	}),

	mounted() {
		// Listen for messages from the main process
		window.eventBridge?.receive(`show-environment-modal`, domains => {
			this.domains = domains;
			this.visible = true;
		});
	},

	methods: {
		choose(domain, domainIndex) {
			// show a loader on the chosen domain
			this.loadingIndex = domainIndex;

			// timeout for user feedback + time to load test environment
			setTimeout(() => {
				window.eventBridge?.send(`environment-selected`, domain);
				this.visible = false;
			}, 200);
		},

		tooltip(domain) {
			const message = `Set environment title in Eyas config`;
			return domain.url === domain.title ? message : domain.url;
		},

		hideUi() {
			// hide the UI if there are no other dialogs open
			if(document.querySelectorAll(`.v-dialog`).length <= 1) {
				window.eventBridge?.send(`hide-ui`);
			}
		},

		environmentHotkey(event) {
			// setup
			const keyAsNumber = Number(event.key);

			// if the key pressed isn't a number, exit
			if(isNaN(keyAsNumber)) { return; }

			// check that the key pressed is within the range of the domains
			if(keyAsNumber > 0 && keyAsNumber <= this.domains.length) {
				const chosenIndex = keyAsNumber - 1;

				// choose the domain at the index of the key pressed
				this.choose(this.domains[chosenIndex].url, chosenIndex);
			}
		}
	}
}
</script>