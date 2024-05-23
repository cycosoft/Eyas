<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-h6">Link Requires Additional Information</p>
				<small>{{ link }}</small>

				<v-sheet class="mt-10">
					<v-row
                        v-for="(variable, index) in variables"
                        :key="index"
                    >
						<!-- detect lists -->
						<v-select
							v-if="variable.type === `list`"
							label="Select"
							:items="variable.options.map(option => option || `{blank}`)"
						/>

						<!-- detect booleans -->
						<v-checkbox
							v-if="variable.type === `bool`"
							label="Enabled"
						/>

						<!-- detect integers -->
						<v-text-field
							v-if="variable.type === `int`"
							type="number"
							label="Enter a number"
						/>

						<!-- detect strings -->
						<v-text-field
							v-if="variable.type === `str`"
							label="Enter a string"
						/>
					</v-row>
				</v-sheet>
			</v-card-text>

			<v-card-actions>
					<v-btn @click="cancel">
						Cancel
					</v-btn>

					<div class="flex-grow-1" />

					<v-btn
						color="primary"
						variant="elevated"
						@click="launch"
					>
						Continue
					</v-btn>
				</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data: () => ({
		visible: true,
		link: `https://{dev|staging|}.cycosoft.com?id={int}&message={str}&enabled={bool}`
	}),

    computed: {
        parsedLink () {
            return this.link ? new URL(this.link) : null;
        },

        variables () {
			const output = [];
			const variables = this.link.match(/{[^{}]+}/g);

			// for each variable
			variables.forEach(variable => {
				// setup
				const data = {};
				const type = variable.substring(1, variable.length - 1);
				const isList = type.includes(`|`);

				// populate the data object
				data.type = isList ? `list` : type;
				if(isList) { data.options = type.split(`|`); }

				// push the data object to the output
				output.push(data);
			});

			console.log(JSON.stringify(output, null, 2));

            return output;
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
		cancel() {
			this.visible = false;
		},

		launch() {
			this.parsedLink && window.eventBridge?.send(`launch-link`, this.parsedLink);
			this.visible = false;
		}
	}
}
</script>