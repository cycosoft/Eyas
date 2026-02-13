<template>
	<ModalWrapper v-model="visible">
		<v-card class="pa-3">
			<v-card-title class="text-h6">Expose test server setup</v-card-title>
			<v-card-text>
				<p class="mb-4">Complete these steps if needed, then click Continue to start the server.</p>

				<v-list v-if="steps.length">
					<v-list-item
						v-for="step in steps"
						:key="step.id"
						:class="{ 'text-success': step.status === 'done' }"
					>
						<template v-slot:prepend>
							<v-icon v-if="step.status === 'done'">mdi-check-circle</v-icon>
							<v-icon v-else>mdi-circle-outline</v-icon>
						</template>
						<v-list-item-title>{{ step.label }}</v-list-item-title>
						<template v-slot:append>
							<v-btn
								v-if="step.canInitiate && step.status !== 'done'"
								size="small"
								variant="tonal"
								@click="initiate(step.id)"
							>
								Initiate
							</v-btn>
							<v-btn
								v-else-if="step.canRevoke && step.status === 'done'"
								size="small"
								variant="tonal"
								color="warning"
								@click="revoke(step.id)"
							>
								Revoke
							</v-btn>
						</template>
					</v-list-item>
				</v-list>

				<v-expansion-panels class="mt-4">
					<v-expansion-panel>
						<v-expansion-panel-title>Manually add to etc/hosts</v-expansion-panel-title>
						<v-expansion-panel-text>
							<p class="mb-2">Add this line to your etc/hosts file (e.g. /etc/hosts on macOS/Linux):</p>
							<v-sheet class="pa-2 font-mono text-body2" rounded>
								<code>{{ hostsLine }}</code>
							</v-sheet>
							<v-btn
								class="mt-2"
								size="small"
								variant="outlined"
								@click="copyHostsLine"
							>
								Copy line
							</v-btn>
						</v-expansion-panel-text>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn @click="cancel">
					Cancel
				</v-btn>
				<v-btn color="primary" @click="continueStart">
					Continue
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script>
import ModalWrapper from '@/components/ModalWrapper.vue';

const defaults = {
	visible: false,
	domain: '',
	hostnameForHosts: 'local.test',
	steps: []
};

export default {
	components: {
		ModalWrapper
	},

	data: () => ({ ...defaults }),

	computed: {
		hostsLine() {
			const ip = '127.0.0.1';
			const host = this.hostnameForHosts || 'local.test';
			return `${ip}\t${host}`;
		}
	},

	mounted() {
		window.eyas?.receive(`show-expose-setup-modal`, (payload) => {
			this.domain = payload.domain || '';
			this.hostnameForHosts = payload.hostnameForHosts || 'local.test';
			this.steps = Array.isArray(payload.steps) ? payload.steps : [];
			this.visible = true;
		});
	},

	methods: {
		initiate(stepId) {
			window.eyas?.send(`expose-setup-step`, { action: 'initiate', stepId });
		},

		revoke(stepId) {
			window.eyas?.send(`expose-setup-step`, { action: 'revoke', stepId });
		},

		copyHostsLine() {
			navigator.clipboard.writeText(this.hostsLine);
		},

		cancel() {
			this.visible = false;
			Object.assign(this.$data, defaults);
		},

		continueStart() {
			window.eyas?.send(`expose-setup-continue`);
			this.visible = false;
			Object.assign(this.$data, defaults);
		}
	}
};
</script>
