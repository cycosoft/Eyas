<template>
	<ModalWrapper v-model="visible">
		<v-card>
			<v-card-title class="text-title-large pt-3 px-3" data-qa="test-server-setup-title">
				Live Test Server Setup
			</v-card-title>
			<v-card-text class="px-3">
				<p class="mb-4">
					Configure your test server settings and click Continue to start.
				</p>

				<v-list>
					<v-list-item>
						<template #prepend>
							<v-icon>mdi-shield-lock-outline</v-icon>
						</template>
						<v-list-item-title>Enable HTTPS for Test Server</v-list-item-title>
						<template #append>
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
						<template #prepend>
							<v-icon>mdi-open-in-new</v-icon>
						</template>
						<v-list-item-title>Open in browser when started</v-list-item-title>
						<template #append>
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
						<template #prepend>
							<v-icon>mdi-earth</v-icon>
						</template>
						<v-list-item-title>Use a custom domain <code>{{ hostnameForHosts }}{{ displayPort }}</code></v-list-item-title>
						<template #append>
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
					<p class="mb-2">
						<strong>Custom domain via hosts file</strong>
					</p>
					<p class="mb-2">
						If you want to use a custom domain like <code>{{ hostnameForHosts }}</code>, manually add this line to your hosts file:
					</p>
					<v-sheet title="Click to copy" class="hosts-copy-block mt-2 pa-2 font-mono text-body-medium cursor-pointer d-flex justify-space-between align-center" rounded @click="copyHostsLine">
						<code>{{ hostsLine }}</code>
						<v-icon size="small" :icon="copyIcon" color="warning" />
					</v-sheet>
					<p v-if="isWindows" class="mt-2 text-body-small">
						Hosts file location: <code>C:\Windows\System32\drivers\etc\hosts</code>
					</p>
					<p v-else class="mt-2 text-body-small">
						Hosts file location: <code>/etc/hosts</code>
					</p>
				</v-alert>

				<v-alert v-if="useHttps" type="info" variant="tonal" class="mt-4">
					<p class="mb-2">
						<strong>Using HTTPS</strong>
					</p>
					<p class="mb-2">
						Your server will be available at <code>https://{{ displayDomain }}{{ displayPort }}</code>
					</p>
					<p class="mb-0">
						Your browser will show a "Connection not private" warning. Click <strong>Advanced → Proceed to {{ displayDomain }} (unsafe)</strong> to continue.
					</p>
				</v-alert>

				<v-alert v-else type="info" variant="tonal" class="mt-4">
					<p class="mb-2">
						<strong>Using HTTP</strong>
					</p>
					<p class="mb-0">
						Your server will be available at <code>http://{{ displayDomain }}{{ displayPort }}</code>
					</p>
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

<script lang="ts">
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { IsVisible, DomainUrl, PortNumber, IconName, IsActive, ProjectId, ChannelName, PortString, LabelString, SettingKey, SettingValue, IsWindows, StepId } from '@/../../../types/primitives.js';

type TestServerSetupState = {
	visible: IsVisible;
	domain: DomainUrl;
	hostnameForHosts: DomainUrl;
	steps: StepId[];
	portHttp: PortNumber;
	portHttps: PortNumber;
	isWindows: IsWindows;
	copyIcon: IconName;
	internalUseHttps: IsActive;
	internalAutoOpenBrowser: IsActive;
	internalUseCustomDomain: IsActive;
	projectId: ProjectId | null;
}

const defaults = {
	visible: false,
	domain: ``,
	hostnameForHosts: `test.local`,
	steps: [],
	portHttp: 12701,
	portHttps: 12701,
	isWindows: false,
	copyIcon: `mdi-content-copy`
};

export default {
	components: {
		ModalWrapper
	},

	data: (): TestServerSetupState => ({
		...defaults,
		internalUseHttps: false,
		internalAutoOpenBrowser: true,
		internalUseCustomDomain: false,
		projectId: null
	}),

	computed: {
		useHttps: {
			get(): IsActive { return this.internalUseHttps; },
			set(val: IsActive): void {
				this.internalUseHttps = val;
				this.saveSetting(`testServer.useHttps` as SettingKey, val);
			}
		},
		autoOpenBrowser: {
			get(): IsActive { return this.internalAutoOpenBrowser; },
			set(val: IsActive): void {
				this.internalAutoOpenBrowser = val;
				this.saveSetting(`testServer.autoOpenBrowser` as SettingKey, val);
			}
		},
		useCustomDomain: {
			get(): IsActive { return this.internalUseCustomDomain; },
			set(val: IsActive): void {
				this.internalUseCustomDomain = val;
				this.saveSetting(`testServer.useCustomDomain` as SettingKey, val);
			}
		},
		hostsLine(): LabelString {
			const ip = `127.0.0.1`;
			const host = this.hostnameForHosts || `test.local`;
			return `${ip}\t${host}`;
		},
		displayDomain(): DomainUrl {
			return this.useCustomDomain ? (this.hostnameForHosts || `test.local`) : `127.0.0.1`;
		},
		port(): PortNumber {
			return this.useHttps ? this.portHttps : this.portHttp;
		},
		displayPort(): PortString {
			return (this.useHttps && this.port === 443) || (!this.useHttps && this.port === 80) ? `` : `:${this.port}`;
		}
	},

	mounted(): void {
		window.eyas?.receive(`show-test-server-setup-modal` as ChannelName, payload => {
			this.domain = payload.domain || ``;
			this.hostnameForHosts = payload.hostnameForHosts || `test.local`;
			this.steps = Array.isArray(payload.steps) ? payload.steps : [];

			// Set internal values directly to avoid triggering setters unnecessarily
			this.internalUseHttps = !!payload.useHttps;
			this.internalAutoOpenBrowser = payload.autoOpenBrowser !== undefined ? !!payload.autoOpenBrowser : true;
			this.internalUseCustomDomain = !!payload.useCustomDomain;
			this.projectId = payload.projectId || null;

			this.portHttp = payload.portHttp || 12701;
			this.portHttps = payload.portHttps || 12701;
			this.isWindows = !!payload.isWindows;
			this.visible = true;
		});
	},

	methods: {
		initiate(stepId: StepId): void {
			window.eyas?.send(`test-server-setup-step` as ChannelName, { action: `initiate`, stepId });
		},

		revoke(stepId: StepId): void {
			window.eyas?.send(`test-server-setup-step` as ChannelName, { action: `revoke`, stepId });
		},

		copyHostsLine(): void {
			navigator.clipboard.writeText(this.hostsLine);
			this.copyIcon = `mdi-check`;
			setTimeout(() => {
				this.copyIcon = `mdi-content-copy`;
			}, 2000);
		},

		cancel(): void {
			this.visible = false;
			Object.assign(this.$data, {
				...defaults,
				internalUseHttps: false,
				internalAutoOpenBrowser: true,
				internalUseCustomDomain: false,
				projectId: null
			});
		},

		continueStart(): void {
			window.eyas?.send(`test-server-setup-continue` as ChannelName, {
				useHttps: this.useHttps,
				autoOpenBrowser: this.autoOpenBrowser,
				useCustomDomain: this.useCustomDomain
			});
			this.visible = false;
			Object.assign(this.$data, {
				...defaults,
				internalUseHttps: false,
				internalAutoOpenBrowser: true,
				internalUseCustomDomain: false,
				projectId: null
			});
		},

		saveSetting(key: SettingKey, value: SettingValue): void {
			window.eyas?.send(`save-setting` as ChannelName, { key, value, projectId: this.projectId });
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
