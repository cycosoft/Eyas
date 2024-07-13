<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
		:scrim="false"
		@after-leave="hideUi"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-h6 mb-10">⚠️ Possible Update Available ⚠️</p>

				<v-sheet>
					<v-row class="mt-8 px-14">
						This test was created with a newer version of Eyas, and may not run as expected.
					</v-row>
					<v-row class="mt-12">
						<v-col class="text-center">
							<v-btn
								color="primary"
								@click="checkForUpdate"
							>Check For Update</v-btn>
						</v-col>
					</v-row>
				</v-sheet>
			</v-card-text>

			<v-card-actions>
				<v-col class="text-caption">
					<span v-if="runnerVersion">runner: ({{ runnerVersion }})</span>
					<span v-if="runnerVersion && testVersion" class="text-grey-lighten-1 mx-1">&lt;</span>
					<span v-if="testVersion">test ({{ testVersion }})</span>
				</v-col>
				<v-btn
					color="primary"
					@click="visible = false"
				>Later</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data: () => ({
		visible: false,
		runnerVersion: null,
		testVersion: null
	}),

	mounted() {
		// Listen for messages from the main process
		window.eventBridge?.receive(`show-version-mismatch-modal`, (runnerVersion, testVersion) => {
			this.runnerVersion = runnerVersion;
			this.testVersion = testVersion;
			this.visible = true;
		});
	},

	methods: {
		hideUi() {
			// hide the UI if there are no other dialogs open
			if(document.querySelectorAll(`.v-dialog`).length <= 1) {
				window.eventBridge?.send(`hide-ui`);
			}
		},

		checkForUpdate() {
			const url = `https://github.com/cycosoft/Eyas/releases`;
			window.eventBridge?.send(`launch-link`, { url, openInBrowser: true });
		}
	}
}
</script>