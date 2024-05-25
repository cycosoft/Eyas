<template>
	<v-dialog
		v-model="visible"
		persistent
		width="auto"
	>
		<v-card class="pa-3">
			<v-card-text>
				<p class="font-weight-black text-center text-h6">Link Requires Additional Information</p>

				<v-sheet class="my-10">
					<v-row
                        v-for="(variable, index) in variables"
                        :key="index"
                    >
						<!-- detect lists -->
						<v-select
							v-if="variable.type === `list`"
							v-model="form[index]"
							:label="getFieldLabel(`Select option`, variable.field)"
							:items="variable.options.map(option => option || `{blank}`)"
						/>

						<!-- detect booleans -->
						<v-radio-group
							v-if="variable.type === `bool`"
							v-model="form[index]"
							inline
							class="mt-3"
							:label="getFieldLabel(`Select value`, variable.field)"
						>
							<v-radio
								v-for="(option, index) in [`false`, `true`]"
								:key="index"
								:value="option"
								:label="option"
								class="text-capitalize"
							/>
						</v-radio-group>

						<!-- detect integers -->
						<v-text-field
							v-if="variable.type === `int`"
							v-model="form[index]"
							type="number"
							:label="getFieldLabel(`Enter number`, variable.field)"
						/>

						<!-- detect strings -->
						<v-text-field
							v-if="variable.type === `str`"
							v-model="form[index]"
							:label="getFieldLabel(`Enter text`, variable.field)"
						/>
					</v-row>
				</v-sheet>

				<v-icon v-if="linkIsValid" class="mr-2" color="success">mdi-check-circle-outline</v-icon>
				<v-icon v-else class="mr-2" color="error">mdi-alert-rhombus-outline</v-icon>
				<small>{{ parsedLink }}</small>

				<p>{{form}}</p>
			</v-card-text>

			<v-card-actions>
					<v-btn @click="cancel">
						Cancel
					</v-btn>

					<div class="flex-grow-1" />

					<v-btn
						color="primary"
						variant="elevated"
						:disabled="!linkIsValid"
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
		link: `https://{dev|staging|}.cycosoft.com?id={int}&message={str}&enabled={bool}`,
		form: []
	}),

    computed: {
        parsedLink () {
			// copy for manipulation
            let output = this.link;
			const form = [...this.form];

			// replace all variables with form data
            return output.replace(/{([^{}]+)}/g, (wholeMatch, type) => {
				return type ? encodeURIComponent(form.shift()) : wholeMatch;
			})
        },

		linkIsValid () {
			return false;
		},

        variables () {
			// setup
			const output = [];

			// find all variables in the link
			const variables = this.link.matchAll(/([\?|&](\w*)=)?{([^{}]+)}/g);

			// for each variable found
			for (const variable of variables) {
				// setup
				const data = {};
				const type = variable[3];
				const isList = variable[3].includes(`|`);
				const hasField = variable[2];

				// populate the data object
				data.type = isList ? `list` : type;

				// add the field if it exists
				if (hasField) {
					data.field = variable[2];
				}

				// add the options or label
				if(isList) {
					data.options = variable[3].split(`|`);
				}

				// push the data object to the output
				output.push(data);
			}

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
		},

		getFieldLabel(prefix, field) {
			return `${prefix}${field ? ` for "${field}" field` : ``}`;
		}
	}
}
</script>