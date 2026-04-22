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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { IsVisible, DomainUrl, PortNumber, IconName, IsActive, ProjectId, ChannelName, PortString, LabelString, SettingKey, SettingValue, IsWindows, StepId } from '@/../../../types/primitives.js';

const visible = ref<IsVisible>(false);
const domain = ref<DomainUrl>(``);
const hostnameForHosts = ref<DomainUrl>(`test.local`);
const steps = ref<StepId[]>([]);
const portHttp = ref<PortNumber>(12701);
const portHttps = ref<PortNumber>(12701);
const isWindows = ref<IsWindows>(false);
const copyIcon = ref<IconName>(`mdi-content-copy`);
const internalUseHttps = ref<IsActive>(false);
const internalAutoOpenBrowser = ref<IsActive>(true);
const internalUseCustomDomain = ref<IsActive>(false);
const projectId = ref<ProjectId | null>(null);

const reset = (): void => {
	visible.value = false;
	domain.value = ``;
	hostnameForHosts.value = `test.local`;
	steps.value = [];
	portHttp.value = 12701;
	portHttps.value = 12701;
	isWindows.value = false;
	copyIcon.value = `mdi-content-copy`;
	internalUseHttps.value = false;
	internalAutoOpenBrowser.value = true;
	internalUseCustomDomain.value = false;
	projectId.value = null;
};

const saveSetting = (key: SettingKey, value: SettingValue): void => {
	window.eyas?.send(`save-setting` as ChannelName, { key, value, projectId: projectId.value });
};

const useHttps = computed({
	get(): IsActive { return internalUseHttps.value; },
	set(val: IsActive): void {
		internalUseHttps.value = val;
		saveSetting(`testServer.useHttps` as SettingKey, val);
	}
});

const autoOpenBrowser = computed({
	get(): IsActive { return internalAutoOpenBrowser.value; },
	set(val: IsActive): void {
		internalAutoOpenBrowser.value = val;
		saveSetting(`testServer.autoOpenBrowser` as SettingKey, val);
	}
});

const useCustomDomain = computed({
	get(): IsActive { return internalUseCustomDomain.value; },
	set(val: IsActive): void {
		internalUseCustomDomain.value = val;
		saveSetting(`testServer.useCustomDomain` as SettingKey, val);
	}
});

const hostsLine = computed((): LabelString => {
	const ip = `127.0.0.1`;
	const host = hostnameForHosts.value || `test.local`;
	return `${ip}\t${host}`;
});

const displayDomain = computed((): DomainUrl => {
	return useCustomDomain.value ? (hostnameForHosts.value || `test.local`) : `127.0.0.1`;
});

const port = computed((): PortNumber => {
	return useHttps.value ? portHttps.value : portHttp.value;
});

const displayPort = computed((): PortString => {
	return (useHttps.value && port.value === 443) || (!useHttps.value && port.value === 80) ? `` : `:${port.value}`;
});



const copyHostsLine = (): void => {
	navigator.clipboard.writeText(hostsLine.value);
	copyIcon.value = `mdi-check`;
	setTimeout(() => {
		copyIcon.value = `mdi-content-copy`;
	}, 2000);
};

const cancel = (): void => {
	reset();
};

const continueStart = (): void => {
	window.eyas?.send(`test-server-setup-continue` as ChannelName, {
		useHttps: useHttps.value,
		autoOpenBrowser: autoOpenBrowser.value,
		useCustomDomain: useCustomDomain.value
	});
	reset();
};

onMounted(() => {
	window.eyas?.receive(`show-test-server-setup-modal` as ChannelName, payload => {
		domain.value = payload.domain || ``;
		hostnameForHosts.value = payload.hostnameForHosts || `test.local`;
		steps.value = Array.isArray(payload.steps) ? payload.steps : [];

		// Set internal values directly to avoid triggering setters unnecessarily
		internalUseHttps.value = !!payload.useHttps;
		internalAutoOpenBrowser.value = payload.autoOpenBrowser !== undefined ? !!payload.autoOpenBrowser : true;
		internalUseCustomDomain.value = !!payload.useCustomDomain;
		projectId.value = payload.projectId || null;

		portHttp.value = payload.portHttp || 12701;
		portHttps.value = payload.portHttps || 12701;
		isWindows.value = !!payload.isWindows;
		visible.value = true;
	});
});

defineExpose({
	visible,
	domain,
	hostnameForHosts,
	steps,
	portHttp,
	portHttps,
	isWindows,
	copyIcon,
	internalUseHttps,
	internalAutoOpenBrowser,
	internalUseCustomDomain,
	projectId,
	useHttps,
	autoOpenBrowser,
	useCustomDomain,
	hostsLine,
	displayDomain,
	port,
	displayPort,
	copyHostsLine,
	cancel,
	continueStart
});
</script>

<style scoped>
.hosts-copy-block {
	transition: background-color 0.2s ease;
}
.hosts-copy-block:hover {
	background-color: rgba(var(--v-theme-warning), 0.15) !important;
}
</style>
