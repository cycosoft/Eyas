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

<script lang="ts">
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { IsVisible, AppVersion, ChannelName, DomainUrl } from '@/../../../types/primitives.js';

type VersionMismatchState = {
	visible: IsVisible;
	runnerVersion: AppVersion | null;
	testVersion: AppVersion | null;
}

export default {
	components: {
		ModalWrapper
	},

	data: (): VersionMismatchState => ({
		visible: false,
		runnerVersion: null,
		testVersion: null
	}),

	mounted(): void {
		window.eyas?.receive(`show-version-mismatch-modal` as ChannelName, ({ runnerVersion, testVersion } = {}) => {
			this.runnerVersion = runnerVersion || null;
			this.testVersion = testVersion || null;
			this.visible = true;
		});
	},

	methods: {
		checkForUpdate(): void {
			window.eyas?.send(`open-external` as ChannelName, `https://github.com/cycosoft/eyas/releases` as DomainUrl);
		}
	}
};
</script>