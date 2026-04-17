<template>
	<ModalWrapper
		v-model="isVisible"
		min-width="600"
		data-qa="whats-new-modal"
	>
		<v-card>
			<v-card-title class="text-title-large pt-3 px-3">
				{{ title }}
			</v-card-title>

			<v-divider />

			<v-card-text class="pa-0">
				<v-expansion-panels
					v-model="expandedPanels"
					variant="accordion"
					multiple
				>
					<v-expansion-panel
						v-for="entry in changelog"
						:key="entry.version"
						:value="entry.version"
					>
						<v-expansion-panel-title>
							<div class="d-flex align-center">
								<span class="text-h6 mr-2">{{ entry.version }}</span>
								<v-chip
									v-if="entry.version === currentVersion"
									size="x-small"
									color="primary"
									variant="flat"
								>
									Latest
								</v-chip>
							</div>
						</v-expansion-panel-title>

						<v-expansion-panel-text>
							<!-- Notes -->
							<div
								v-if="entry.notes"
								class="text-body-2 mb-4 font-italic"
							>
								<template v-for="(token, i) in tokenize(entry.notes)" :key="i">
									<code v-if="token.type === `code`" class="mx-1 px-1 rounded bg-grey-lighten-4 text-primary">{{ token.content }}</code>
									<a v-else-if="token.type === `link`" :href="token.url" target="_blank" rel="noopener noreferrer">{{ token.content }}</a>
									<template v-else>
										{{ token.content }}
									</template>
								</template>
							</div>

							<!-- Items -->
							<component
								:is="entry.listType === 'ordered' ? 'ol' : 'ul'"
								class="pl-6"
							>
								<li
									v-for="(item, index) in entry.items"
									:key="index"
									class="mb-2"
								>
									<span>
										<template v-for="(token, i) in tokenize(item.text)" :key="i">
											<code v-if="token.type === `code`" class="mx-1 px-1 rounded bg-grey-lighten-4 text-primary">{{ token.content }}</code>
											<a v-else-if="token.type === `link`" :href="token.url" target="_blank" rel="noopener noreferrer">{{ token.content }}</a>
											<template v-else>{{ token.content }}</template>
										</template>
									</span>

									<!-- Sub-items -->
									<component
										:is="item.subItemsType === 'ordered' ? 'ol' : 'ul'"
										v-if="item.subItems?.length"
										class="pl-6 mt-1"
									>
										<li
											v-for="(sub, subIndex) in item.subItems"
											:key="subIndex"
										>
											<template v-for="(token, i) in tokenize(sub)" :key="i">
												<code v-if="token.type === `code`" class="mx-1 px-1 rounded bg-grey-lighten-4 text-primary">{{ token.content }}</code>
												<a v-else-if="token.type === `link`" :href="token.url" target="_blank" rel="noopener noreferrer">{{ token.content }}</a>
												<template v-else>
													{{ token.content }}
												</template>
											</template>
										</li>
									</component>
								</li>
							</component>
						</v-expansion-panel-text>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-card-text>

			<v-divider />

			<v-card-actions class="pa-4">
				<v-spacer />
				<v-btn
					color="primary"
					variant="text"
					@click="close"
				>
					Close
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script lang="ts">
import { ref, computed, onMounted } from 'vue';
import useSettingsStore from '@/stores/settings.js';
import ModalWrapper from '@/components/ModalWrapper.vue';
import { getAggregatedChanges, tokenizeMarkdownSubset } from '@/utils/changelog-utils.js';
import changelogData from '../CHANGELOG.json';

function useWhatsNewModal(): object {
	const settingsStore = useSettingsStore();
	const isVisible = ref(false);
	const changelog = ref([]);
	const expandedPanels = ref([]);
	const mode = ref(`launch`); // `launch` or `manual`
	const currentVersion = computed(() => changelogData[0]?.version);
	const lastSeenVersion = computed(() => settingsStore.appSettings.lastSeenVersion || `0.0.0`);
	const title = computed(() => mode.value === `manual` ? `Changelog` : `What's New`);

	const showFromMain = async (): Promise<void> => {
		changelog.value = changelogData;
		const unseen = getAggregatedChanges(changelog.value, lastSeenVersion.value, currentVersion.value);
		if (unseen.length > 0) {
			mode.value = `launch`;
			expandedPanels.value = unseen.map(u => u.version);
			isVisible.value = true;
		} else {
			window.eyas?.send(`whats-new-closed`);
		}
	};

	const showManual = async (): Promise<void> => {
		changelog.value = changelogData;
		mode.value = `manual`;
		if (changelog.value.length > 0) {
			expandedPanels.value = [changelog.value[0].version];
		}
		isVisible.value = true;
	};

	const close = (): void => {
		isVisible.value = false;
		if (currentVersion.value !== lastSeenVersion.value) {
			window.eyas?.send(`save-setting`, { key: `lastSeenVersion`, value: currentVersion.value });
		}
		window.eyas?.send(`whats-new-closed`);
	};

	onMounted(() => {
		window.eyas?.receive(`show-whats-new`, (isManual: boolean) => {
			if (isManual) { showManual(); } else { showFromMain(); }
		});
	});

	return {
		isVisible, changelog, expandedPanels, currentVersion,
		tokenize: tokenizeMarkdownSubset, close, mode, title,
		showFromMain, showManual
	};
}

export default {
	components: {
		ModalWrapper
	},

	setup(): object {
		return useWhatsNewModal();
	}
};
</script>

<style scoped>
/* Ensure list item bullets don't overlap with icons if we had them */
li {
	line-height: 1.4;
}

/* Style for external links inside v-html */
:deep(a) {
	color: rgb(var(--v-theme-primary));
	text-decoration: none;
}
:deep(a:hover) {
	text-decoration: underline;
}

/* Style for inline code */
:deep(code) {
	background-color: rgba(var(--v-border-color), 0.1);
	padding: 2px 4px;
	border-radius: 4px;
	font-family: monospace;
	font-size: 0.9em;
}
</style>
