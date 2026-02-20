<template>
	<ModalWrapper v-model="visible">
		<v-card class="pa-3">
			<v-card-title class="text-h6" data-qa="expose-setup-title">Expose test server setup</v-card-title>
			<v-card-text>
				<p class="mb-4">Configure your expose server settings and click Continue to start.</p>

				<v-list>
					<v-list-item>
						<template v-slot:prepend>
							<v-icon>mdi-shield-lock-outline</v-icon>
						</template>
						<v-list-item-title>Enable HTTPS for Expose</v-list-item-title>
						<template v-slot:append>
							<v-switch
								v-model="useHttps"
								color="primary"
								hide-details
								density="compact"
								data-qa="switch-use-https"
							/>
						</template>
					</v-list-item>
				</v-list>

				<v-alert v-if="useHttps" type="info" variant="tonal" class="mt-4">
					<p class="mb-2"><strong>Using HTTPS with self-signed certificates</strong></p>
					<p class="mb-2">Your server will be available at <code>https://127.0.0.1:{{ port }}</code></p>
					<p class="mb-0">Your browser will show a "Connection not private" warning. Click <strong>Advanced → Proceed to 127.0.0.1 (unsafe)</strong> to continue.</p>
				</v-alert>

				<v-alert v-else type="info" variant="tonal" class="mt-4">
					<p class="mb-2"><strong>Using HTTP</strong></p>
					<p class="mb-0">Your server will be available at <code>http://127.0.0.1:{{ port }}</code></p>
				</v-alert>

				<v-expansion-panels class="mt-4">
					<v-expansion-panel>
						<v-expansion-panel-title>Optional: Custom domain via hosts file</v-expansion-panel-title>
						<v-expansion-panel-text>
							<p class="mb-2">If you want to use a custom domain like <code>{{ hostnameForHosts }}</code>, manually add this line to your hosts file:</p>
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
							<p v-if="isWindows" class="mt-2 text-caption">Hosts file location: <code>C:\Windows\System32\drivers\etc\hosts</code></p>
							<p v-else class="mt-2 text-caption">Hosts file location: <code>/etc/hosts</code></p>
						</v-expansion-panel-text>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn data-qa="btn-cancel-expose" @click="cancel">
					Cancel
				</v-btn>
				<v-btn color="primary" data-qa="btn-continue-expose" @click="continueStart">
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
	hostnameForHosts: 'test.local',
	steps: [],
	useHttps: false,
	port: 12701,
	isWindows: false
};

export default {
	components: {
		ModalWrapper
	},

	data: () => ({ ...defaults }),

	computed: {
		hostsLine() {
			const ip = '127.0.0.1';
			const host = this.hostnameForHosts || 'test.local';
			return `${ip}\t${host}`;
		}
	},

	mounted() {
		window.eyas?.receive(`show-expose-setup-modal`, (payload) => {
			this.domain = payload.domain || '';
			this.hostnameForHosts = payload.hostnameForHosts || 'test.local';
			this.steps = Array.isArray(payload.steps) ? payload.steps : [];
			this.useHttps = !!payload.useHttps;
			this.port = payload.port || 12701;
			this.isWindows = !!payload.isWindows;
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
			window.eyas?.send(`expose-setup-continue`, { useHttps: this.useHttps });
			this.visible = false;
			Object.assign(this.$data, defaults);
		}
	}
};
</script>
