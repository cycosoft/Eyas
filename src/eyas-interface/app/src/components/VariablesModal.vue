<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-h6 mb-10">Link Requires Information</p>

				<v-sheet>
					<v-row
                        v-for="(variable, index) in variables"
                        :key="index"
                    >
						{{ variable }}
					</v-row>
				</v-sheet>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data: () => ({
		visible: true,
		link: `{testdomain}?id={int}&message={str}&enabled={bool}&options={dev|stage|}`
	}),

    computed: {
        parsedLink () {
            return this.link ? new URL(this.link) : null;
        },

        variables () {
            return [`int`];
        }
    },

	mounted() {
		// Listen for messages from the main process
		window.eventBridge?.receive(`show-variables-modal`, link => {
			this.link = link;
			this.visible = true;
		});
	},

	methods: {
		launch() {
			this.parsedLink && window.eventBridge?.send(`launch-link`, this.parsedLink);
			this.visible = false;
		}
	}
}
</script>