<template>
	<EyasModal v-model="visible">
		<template #title>
			<h2 class="font-headline text-h5 font-weight-bold text-on-surface tracking-tight mb-2" data-qa="environment-modal-title">
				Choose Test Environment
			</h2>
			<p class="font-body text-body-2 text-grey-darken-1 leading-relaxed max-w-[90%] mx-auto">
				Eyas simulates these domains locally to handle environment-specific requirements like authentication and cookies. Your application is always served from your local files.
			</p>
		</template>

		<div class="domains-list custom-scrollbar">
			<v-btn
				v-for="(domain, index) in domains"
				:key="index"
				class="w-full text-left justify-start py-4 px-4 mb-3 rounded-lg env-btn"
				:class="{ 'active-env': loadingIndex === index }"
				variant="flat"
				:loading="loadingIndex === index"
				block
				data-qa="btn-env"
				@click="onSelectEnvironment(domain, index)"
			>
				<template #prepend>
					<div class="icon-box mr-4" :class="{ 'active-icon-box': loadingIndex === index }">
						<v-icon size="22">
							{{ getIcon(domain) }}
						</v-icon>
					</div>
				</template>

				<div class="d-flex flex-column align-start">
					<span class="font-headline font-weight-bold text-body-1 text-high-emphasis">
						{{ domain.title }}
					</span>
					<span class="font-body text-caption text-grey env-url text-body-small">
						{{ domain.url }}
					</span>
				</div>
			</v-btn>
		</div>

		<v-alert
			type="info"
			color="amber-darken-4"
			icon="mdi-information-outline"
			variant="outlined"
			class="rounded-lg py-3 mt-4 mx-16 bg-amber-lighten-5 text-body-small"
		>
			Your choice will be remembered for this project. You can quickly switch between environments anytime using the menu in the URL bar.
		</v-alert>

		<template #actions>
			<v-checkbox
				v-model="alwaysChoose"
				label="Remember this choice"
				density="compact"
				hide-details
				data-qa="checkbox-always-choose"
				class="text-body-small"
				@update:model-value="onAlwaysChooseChange"
			/>
		</template>
	</EyasModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import EyasModal from '@/components/EyasModal.vue';
import type { EnvironmentChoiceWithTitle } from '@registry/core.js';
import type { IsVisible, ListIndex, IsActive, ProjectId, ChannelName, HashString, LabelString } from '@registry/primitives.js';

const visible = ref<IsVisible>(false);
const domains = ref<EnvironmentChoiceWithTitle[]>([]);
const loadingIndex = ref<ListIndex>(-1);
const alwaysChoose = ref<IsActive>(false);
const projectId = ref<ProjectId | null>(null);
const domainsHash = ref<HashString | null>(null);

const reset = (): void => {
	visible.value = false;
	domains.value = [];
	loadingIndex.value = -1;
	alwaysChoose.value = false;
	projectId.value = null;
	domainsHash.value = null;
};

const getIcon = (domain: EnvironmentChoiceWithTitle): LabelString => {
	const url = domain.url.toLowerCase();
	if (url.startsWith(`eyas://`) || url.includes(`local`) || url.includes(`internal`)) {
		return `mdi-console`;
	}
	return `mdi-earth`;
};

const choose = (domain: EnvironmentChoiceWithTitle, domainIndex: ListIndex): void => {
	loadingIndex.value = domainIndex;
	window.eyas?.send(`save-setting` as ChannelName, {
		key: `env.lastChoice`,
		value: JSON.parse(JSON.stringify(domain)),
		projectId: projectId.value
	});
	window.eyas?.send(`save-setting` as ChannelName, {
		key: `env.lastChoiceHash`,
		value: domainsHash.value,
		projectId: projectId.value
	});
	setTimeout(() => {
		window.eyas?.send(`environment-selected` as ChannelName, JSON.parse(JSON.stringify(domain)));
		visible.value = false;
		setTimeout(reset, 200);
	}, 200);
};

const onSelectEnvironment = (domain: EnvironmentChoiceWithTitle, index: ListIndex): void => {
	choose(domain, index);
};

const onAlwaysChooseChange = (value: IsActive): void => {
	window.eyas?.send(`save-setting` as ChannelName, {
		key: `env.alwaysChoose`,
		value: !!value,
		projectId: projectId.value
	});
};

onMounted(() => {
	window.eyas?.receive(`show-environment-modal` as ChannelName, (newDomains, options = {}) => {
		domains.value = JSON.parse(JSON.stringify(newDomains));
		projectId.value = options.projectId ?? null;
		alwaysChoose.value = !!options.alwaysChoose;
		domainsHash.value = options.domainsHash ?? null;
		visible.value = true;
	});
});

defineExpose({
	visible,
	domains,
	loadingIndex,
	alwaysChoose,
	projectId,
	domainsHash,
	choose,
	onAlwaysChooseChange,
	onSelectEnvironment,
	getIcon
});
</script>

<style scoped>
.domains-list {
	max-height: 380px;
	overflow-y: auto;
}

.env-btn {
	text-transform: none !important;
	letter-spacing: normal !important;
	height: auto !important;
	background-color: rgba(255, 255, 255, 0.6) !important;
	border: 2px solid transparent !important;
	border-left: 4px solid transparent !important;
	transition: all 0.2s ease-in-out;
}

.env-btn:hover, .active-env {
	background-color: #ffffff !important;
	border-color: rgba(88, 161, 214, 0.3) !important;
	border-left-color: #58A1D6 !important;
	box-shadow: 0px 3px 3px rgba(88, 161, 214, 0.15) !important;
	transform: translateY(-1px);
}

.env-btn:hover .icon-box, .active-env .icon-box {
	background-color: rgba(88, 161, 214, 0.1) !important;
	color: #58A1D6 !important;
}

.env-btn:hover .env-url, .active-env .env-url {
	color: #58A1D6 !important;
}

.icon-box {
	width: 40px;
	height: 40px;
	border-radius: 8px;
	background-color: rgba(25, 28, 30, 0.05);
	color: rgba(25, 28, 30, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease-in-out;
}

.custom-scrollbar::-webkit-scrollbar {
	width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
	background: #e2e8f0;
	border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
	background: #cbd5e1;
}
</style>