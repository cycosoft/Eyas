<template>
	<ModalWrapper
		v-model="visible"
		@keyup="hotkeyEnvSelector"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-h6 mb-10" data-qa="environment-modal-title">Select Test Environment</p>

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
									v-tooltip:bottom="tooltip(domain)"
									class="-py-5"
									block
									size="large"
									:stacked="$vuetify.display.smAndUp"
									:loading="loadingIndex === index"
									data-qa="btn-env"
									@click="choose(domain, index)"
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

				<!-- always-choose setting -->
				<v-row class="mt-4" justify="end">
					<v-col cols="auto">
						<v-checkbox
							v-model="alwaysChoose"
							label="Always choose this environment for this project"
							density="compact"
							hide-details
							data-qa="checkbox-always-choose"
							@update:model-value="onAlwaysChooseChange"
						/>
					</v-col>
				</v-row>
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
	loadingIndex: -1,
	alwaysChoose: false,
	projectId: null,
	domainsHash: null
});

export default {
	components: {
		ModalWrapper
	},

	data: () => JSON.parse(defaults),

	mounted() {
		// Listen for messages from the main process
		window.eyas?.receive(`show-environment-modal`, (domains, options = {}) => {
			this.domains = JSON.parse(JSON.stringify(domains));
			this.projectId = options.projectId ?? null;
			this.alwaysChoose = !!options.alwaysChoose;
			this.domainsHash = options.domainsHash ?? null;
			this.visible = true;
		});
	},

	methods: {
		choose(domain, domainIndex) {
			// show a loader on the chosen domain
			this.loadingIndex = domainIndex;

			// save the user's choice and hash so we can skip the modal next time
			window.eyas?.send(`save-setting`, {
				key: `env.lastChoice`,
				value: JSON.parse(JSON.stringify(domain)),
				projectId: this.projectId
			});
			window.eyas?.send(`save-setting`, {
				key: `env.lastChoiceHash`,
				value: this.domainsHash,
				projectId: this.projectId
			});

			// timeout for user feedback + time to load test environment
			setTimeout(() => {
				// send the chosen domain to the main process
				window.eyas?.send(`environment-selected`, JSON.parse(JSON.stringify(domain)));

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
				this.choose(this.domains[chosenIndex], chosenIndex);
			}
		},

		onAlwaysChooseChange(value) {
			// immediately save the setting when the checkbox is toggled
			window.eyas?.send(`save-setting`, {
				key: `env.alwaysChoose`,
				value: !!value,
				projectId: this.projectId
			});
		},

		reset() {
			Object.assign(this.$data, JSON.parse(defaults));
		}
	}
}
</script>