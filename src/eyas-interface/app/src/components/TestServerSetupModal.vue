<template>
	<ModalWrapper v-model="visible">
		<v-card class="pa-3">
			<v-card-title class="text-h6" data-qa="test-server-setup-title">Live Test Server Setup</v-card-title>
			<v-card-text>
				<p class="mb-4">Configure your test server settings and click Continue to start.</p>

				<v-list>
					<v-list-item>
						<template v-slot:prepend>
							<v-icon>mdi-shield-lock-outline</v-icon>
						</template>
						<v-list-item-title>Enable HTTPS for Test Server</v-list-item-title>
						<template v-slot:append>
							<v-switch
								v-model="useHttps"
								color="primary"
								hide-details
								density="compact"
								class="ml-4"
								data-qa="switch-use-https"
							/>
						</template>
					</v-list-item>

					<v-list-item>
						<template v-slot:prepend>
							<v-icon>mdi-open-in-new</v-icon>
						</template>
						<v-list-item-title>Open in browser when started</v-list-item-title>
						<template v-slot:append>
							<v-switch
								v-model="autoOpenBrowser"
								color="primary"
								hide-details
								density="compact"
								class="ml-4"
								data-qa="switch-auto-open"
							/>
						</template>
					</v-list-item>
					<v-list-item>
						<template v-slot:prepend>
							<v-icon>mdi-earth</v-icon>
						</template>
						<v-list-item-title>Use a custom domain <code>{{ hostnameForHosts }}{{ displayPort }}</code></v-list-item-title>
						<template v-slot:append>
							<v-switch
								v-model="useCustomDomain"
								color="primary"
								hide-details
								density="compact"
								class="ml-4"
								data-qa="switch-custom-domain"
							/>
						</template>
					</v-list-item>
				</v-list>

				<v-alert v-if="useCustomDomain" type="warning" variant="tonal" class="mt-4" data-qa="hosts-file-instructions">
					<p class="mb-2"><strong>Custom domain via hosts file</strong></p>
					<p class="mb-2">If you want to use a custom domain like <code>{{ hostnameForHosts }}</code>, manually add this line to your hosts file:</p>
					<v-sheet title="Click to copy" class="hosts-copy-block mt-2 pa-2 font-mono text-body2 cursor-pointer d-flex justify-space-between align-center" rounded @click="copyHostsLine">
						<code>{{ hostsLine }}</code>
						<v-icon size="small" :icon="copyIcon" color="warning" />
					</v-sheet>
					<p v-if="isWindows" class="mt-2 text-caption">Hosts file location: <code>C:\Windows\System32\drivers\etc\hosts</code></p>
					<p v-else class="mt-2 text-caption">Hosts file location: <code>/etc/hosts</code></p>
				</v-alert>

				<v-alert v-if="useHttps" type="info" variant="tonal" class="mt-4">
					<p class="mb-2"><strong>Using HTTPS</strong></p>
					<p class="mb-2">Your server will be available at <code>https://{{ displayDomain }}{{ displayPort }}</code></p>
					<p class="mb-0">Your browser will show a "Connection not private" warning. Click <strong>Advanced → Proceed to {{ displayDomain }} (unsafe)</strong> to continue.</p>
				</v-alert>

				<v-alert v-else type="info" variant="tonal" class="mt-4">
					<p class="mb-2"><strong>Using HTTP</strong></p>
					<p class="mb-0">Your server will be available at <code>http://{{ displayDomain }}{{ displayPort }}</code></p>
				</v-alert>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn data-qa="btn-cancel-test-server" @click="cancel">
					Cancel
				</v-btn>
				<v-btn color="primary" data-qa="btn-continue-test-server" @click="continueStart">
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
	autoOpenBrowser: true,
	useCustomDomain: false,
	portHttp: 12701,
	portHttps: 12701,
	isWindows: false,
	copyIcon: 'mdi-content-copy'
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
		},
		displayDomain() {
			return this.useCustomDomain ? (this.hostnameForHosts || 'test.local') : '127.0.0.1';
		},
		port() {
			return this.useHttps ? this.portHttps : this.portHttp;
		},
		displayPort() {
			return (this.useHttps && this.port === 443) || (!this.useHttps && this.port === 80) ? '' : `:${this.port}`;
		}
	},

	mounted() {
		window.eyas?.receive(`show-test-server-setup-modal`, (payload) => {
			this.domain = payload.domain || '';
			this.hostnameForHosts = payload.hostnameForHosts || 'test.local';
			this.steps = Array.isArray(payload.steps) ? payload.steps : [];
			this.useHttps = !!payload.useHttps;
			this.portHttp = payload.portHttp || 12701;
			this.portHttps = payload.portHttps || 12701;
			this.isWindows = !!payload.isWindows;
			this.visible = true;
		});
	},

	methods: {
		initiate(stepId) {
			window.eyas?.send(`test-server-setup-step`, { action: 'initiate', stepId });
		},

		revoke(stepId) {
			window.eyas?.send(`test-server-setup-step`, { action: 'revoke', stepId });
		},

		copyHostsLine() {
			navigator.clipboard.writeText(this.hostsLine);
			this.copyIcon = 'mdi-check';
			setTimeout(() => {
				this.copyIcon = 'mdi-content-copy';
			}, 2000);
		},

		cancel() {
			this.visible = false;
			Object.assign(this.$data, defaults);
		},

		continueStart() {
			window.eyas?.send(`test-server-setup-continue`, {
				useHttps: this.useHttps,
				autoOpenBrowser: this.autoOpenBrowser,
				useCustomDomain: this.useCustomDomain
			});
			this.visible = false;
			Object.assign(this.$data, defaults);
		}
	}
};
</script>

<style scoped>
.hosts-copy-block {
	transition: background-color 0.2s ease;
}
.hosts-copy-block:hover {
	background-color: rgba(var(--v-theme-warning), 0.15) !important;
}
</style>
