<template>
	<ModalWrapper
		v-model="visible"
		type="dialog"
		@keyup="hotkeyEnvSelector"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-title-large mb-10" data-qa="environment-modal-title">
					Select Test Environment
				</p>

				<v-sheet>
					<v-row>
						<v-col
							v-for="(domain, index) in domains"
							:key="index"
						>
							<v-badge
								:color="loadingIndex === index ? `` : `red-lighten-2`"
								:content="index + 1"
								location="bottom-end"
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
									<template #prepend>
										<v-icon size="40">
											mdi-database
										</v-icon>
									</template>

									<p>{{ domain.title }}</p>
								</v-btn>
							</v-badge>
						</v-col>
					</v-row>
				</v-sheet>

				<!-- always-choose setting -->
				<v-row class="mt-4 justify-end">
					<v-col cols="auto">
						<v-checkbox
							v-model="alwaysChoose"
							label="Remember this choice"
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

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { EnvironmentChoiceWithTitle } from '@/../../../types/core.js';
import type { IsVisible, ListIndex, IsActive, ProjectId, ChannelName, LabelString, HashString } from '@/../../../types/primitives.js';

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

const choose = (domain: EnvironmentChoiceWithTitle, domainIndex: ListIndex): void => {
	// show a loader on the chosen domain
	loadingIndex.value = domainIndex;

	// save the user's choice and hash so we can skip the modal next time
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

	// timeout for user feedback + time to load test environment
	setTimeout(() => {
		// send the chosen domain to the main process
		window.eyas?.send(`environment-selected` as ChannelName, JSON.parse(JSON.stringify(domain)));

		// close the modal
		visible.value = false;

		// reset the modal state
		setTimeout(reset, 200);
	}, 200);
};

const tooltip = (domain: EnvironmentChoiceWithTitle): LabelString => {
	const message = `Set environment title in Eyas config`;
	return domain.url === domain.title ? message : domain.url;
};

const hotkeyEnvSelector = (event: KeyboardEvent): void => {
	// setup
	const keyAsNumber = Number(event.key);

	// if the key pressed isn't a number, exit
	if (isNaN(keyAsNumber)) { return; }

	// check that the key pressed is within the range of the domains
	if (keyAsNumber > 0 && keyAsNumber <= domains.value.length) {
		const chosenIndex = keyAsNumber - 1;

		// choose the domain at the index of the key pressed
		choose(domains.value[chosenIndex], chosenIndex);
	}
};

const onAlwaysChooseChange = (value: IsActive): void => {
	// immediately save the setting when the checkbox is toggled
	window.eyas?.send(`save-setting` as ChannelName, {
		key: `env.alwaysChoose`,
		value: !!value,
		projectId: projectId.value
	});
};

onMounted(() => {
	// Listen for messages from the main process
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
	onAlwaysChooseChange
});
</script>