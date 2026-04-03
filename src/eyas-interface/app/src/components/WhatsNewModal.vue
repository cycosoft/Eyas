<template>
	<ModalWrapper
		v-model="isVisible"
		min-width="600"
		data-qa="whats-new-modal"
	>
		<v-card>
			<v-card-title class="d-flex align-center">
				<v-icon icon="mdi-sparkles" class="mr-2" color="primary" />
				What's New in Eyas
				<v-spacer />
				<v-btn
					icon="mdi-close"
					variant="text"
					@click="close"
				/>
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
								v-html="formatMarkdown(entry.notes)"
							/>

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
									<span v-html="formatMarkdown(item.text)" />
									
									<!-- Sub-items -->
									<component
										:is="item.subItemsType === 'ordered' ? 'ol' : 'ul'"
										v-if="item.subItems?.length"
										class="pl-6 mt-1"
									>
										<li
											v-for="(sub, subIndex) in item.subItems"
											:key="subIndex"
											v-html="formatMarkdown(sub)"
										/>
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
					variant="flat"
					@click="close"
				>
					Got it!
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import useSettingsStore from '@/stores/settings';
import ModalWrapper from '@/components/ModalWrapper.vue';
import { getAggregatedChanges, formatMarkdownSubset } from '@/utils/changelog-utils';

export default {
	components: {
		ModalWrapper
	},

	setup() {
		const settingsStore = useSettingsStore();
		const isVisible = ref(false);
		const changelog = ref([]);
		const expandedPanels = ref([]);
		const mode = ref(`launch`); // `launch` or `manual`

		const currentVersion = computed(() => settingsStore.version);
		const lastSeenVersion = computed(() => settingsStore.appSettings.lastSeenVersion || `0.0.0`);

		const fetchChangelog = async () => {
			try {
				const response = await fetch(`/CHANGELOG.json`);
				changelog.value = await response.json();
			} catch (err) {
				console.error(`Failed to load changelog:`, err);
			}
		};

		const showOnLaunch = async () => {
			await fetchChangelog();
			
			const unseen = getAggregatedChanges(changelog.value, lastSeenVersion.value, currentVersion.value);
			
			if (unseen.length > 0) {
				mode.value = `launch`;
				expandedPanels.value = unseen.map(u => u.version);
				isVisible.value = true;
			}
		};

		const showManual = async () => {
			await fetchChangelog();
			mode.value = `manual`;
			// Only expand the latest version
			if (changelog.value.length > 0) {
				expandedPanels.value = [changelog.value[0].version];
			}
			isVisible.value = true;
		};

		const close = () => {
			isVisible.value = false;
			// Update last seen version if we are in launch mode or if we manually viewed the latest
			if (currentVersion.value !== lastSeenVersion.value) {
				window.eyas?.send(`save-setting`, {
					key: `lastSeenVersion`,
					value: currentVersion.value
				});
			}
		};

		onMounted(() => {
			// Listen for manual trigger from menu
			window.eyas?.receive(`show-whats-new`, showManual);

			// Check for launch trigger once settings are loaded
			const unwatch = settingsStore.$subscribe((mutation, state) => {
				if (state.version !== `0.0.0` && Object.keys(state.appSettings).length > 0) {
					showOnLaunch();
					unwatch();
				}
			});
		});

		return {
			isVisible,
			changelog,
			expandedPanels,
			currentVersion,
			formatMarkdown: formatMarkdownSubset,
			close
		};
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
