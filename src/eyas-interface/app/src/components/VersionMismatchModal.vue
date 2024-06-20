<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
		@after-leave="hideUi"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-h6 mb-10">⚠️ Version Mismatch ⚠️</p>

				<v-sheet>
					<v-row class="mt-8 px-14">
                        This test was created with a newer version of Eyas, and may not run as expected.
					</v-row>
                    <v-row class="mt-12">
                        <v-col class="text-center">
                            <v-btn
                                color="primary"
                                href="https://github.com/cycosoft/Eyas/releases"
                            >Check For Update (browser)</v-btn>
                        </v-col>
                    </v-row>
				</v-sheet>
			</v-card-text>

            <v-card-actions>
                <v-col class="text-caption">
                    runner: ({{ runnerVersion }}) <span class="text-grey-lighten-1">&lt;</span> test ({{ testVersion }})
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
		visible: true,
		runnerVersion: `3.1.0`,
        testVersion: `3.2.0`
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
			window.eventBridge?.send(`hide-ui`);
		}
	}
}
</script>