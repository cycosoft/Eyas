<template>
	<ModalWrapper
		v-model="visible"
		@keyup="hotkeyEnvSelector"
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
								:color="loadingIndex === index ? `` : `red-lighten-2`"
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
	</ModalWrapper>
</template>

<script>
import ModalWrapper from '@/components/ModalWrapper.vue';

// component defaults
const defaults = JSON.stringify({
	visible: false,
	domains: [],
	loadingIndex: -1
});

export default {
	components: {
		ModalWrapper
	},

	data: () => JSON.parse(defaults),

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
				// send the chosen domain to the main process
				window.eventBridge?.send(`environment-selected`, domain);

				// close the modal
				this.visible = false;

				// reset the modal state
				setTimeout(this.reset, 200);
			}, 200);
		},

		tooltip(domain) {
			const message = `Set environment title in Eyas config`;
			return domain.url === domain.title ? message : domain.url;
		},

		hotkeyEnvSelector(event) {
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
		},

		reset() {
			Object.assign(this.$data, JSON.parse(defaults));
		}
	}
}
</script>