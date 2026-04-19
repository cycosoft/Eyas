<template>
	<ModalWrapper v-model="visible" type="dialog">
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-title-large mb-10">
					⚠️ Possible Update Available ⚠️
				</p>

				<v-sheet>
					<v-row class="mt-8 px-14">
						This test was created with a newer version of Eyas, and may not run as expected.
					</v-row>
					<v-row class="mt-12">
						<v-col class="text-center">
							<v-btn
								color="primary"
								@click="checkForUpdate"
							>
								Check For Update
							</v-btn>
						</v-col>
					</v-row>
				</v-sheet>
			</v-card-text>

			<v-card-actions>
				<v-col class="text-body-small">
					<span v-if="runnerVersion">runner: ({{ runnerVersion }})</span>
					<span v-if="runnerVersion && testVersion" class="text-grey-lighten-1 mx-1">&lt;</span>
					<span v-if="testVersion">test ({{ testVersion }})</span>
				</v-col>
				<v-btn
					color="primary"
					@click="visible = false"
				>
					Later
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { IsVisible, AppVersion, ChannelName, DomainUrl } from '@/../../../types/primitives.js';
import type { VersionMismatchData } from '@/../../../types/components.js';

const visible = ref<IsVisible>(false);
const runnerVersion = ref<AppVersion | null>(null);
const testVersion = ref<AppVersion | null>(null);

onMounted(() => {
	window.eyas?.receive(`show-version-mismatch-modal` as ChannelName, data => {
		const { runnerVersion: runner, testVersion: test } = (data || {}) as VersionMismatchData;
		runnerVersion.value = runner || null;
		testVersion.value = test || null;
		visible.value = true;
	});
});


function checkForUpdate(): void {
	window.eyas?.send(`open-external` as ChannelName, `https://github.com/cycosoft/eyas/releases` as DomainUrl);
}
</script>