<template>
	<v-dialog
		v-model="visible"
		persistent
		:width="dialogWidth"
		@after-enter="pinDialogWidth"
		@after-leave="hideUi"
	>
		<v-card class="pa-3 variables-modal-content">
			<v-card-text class="pb-0">
				<p class="font-weight-black text-center text-h6">Link Requires Additional Information</p>

				<v-sheet v-if="link" class="my-10">
					<v-row
                        v-for="(variable, index) in variables"
                        :key="index"
                    >
						<!-- detect lists -->
						<v-select
							v-if="variable.type === `list`"
							v-model="form[index]"
							:label="getFieldLabel(`Select option`, variable.field)"
							:items="variable.options"
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
							hide-spin-buttons
							:label="getFieldLabel(`Enter number`, variable.field)"
						/>

						<!-- detect strings -->
						<v-text-field
							v-if="variable.type === `str`"
							v-model="form[index]"
							:label="getFieldLabel(`Enter text`, variable.field)"
						/>
					</v-row>

					<!-- display the link being updated -->
					<v-row class="pt-2 d-block">
						<v-icon v-if="linkIsValid" class="mr-2" color="success">mdi-check-circle-outline</v-icon>
						<v-icon v-else class="mr-2" color="error">mdi-alert-rhombus-outline</v-icon>
						<small class="parsed-link">{{ parsedLink }}</small>
					</v-row>
				</v-sheet>

				<!-- Error for missing link data state -->
				<v-sheet v-else class="mt-10 mb-4 text-center">
					<v-icon class="mr-2" color="error">mdi-alert-rhombus-outline</v-icon>
					<small>No link received</small>
				</v-sheet>
			</v-card-text>

			<v-card-actions>
					<v-btn @click="close">
						Cancel
					</v-btn>

					<v-spacer />

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
import isURL from 'validator/lib/isURL';

const REGEX_VARIABLES_AND_FIELDS = /([\?|&](\w*)=)?{([^{}]+)}/g;
const REGEX_VARIABLES_ONLY = /{([^{}]+)}/g;

const componentDefaults = JSON.stringify({
	dialogWidth: `auto`,
	visible: false,
	link: ``, //`https://{dev.|staging.|}cycosoft.com?id={int}&message={str}&enabled={bool}`,
	form: []
});

export default {
	data: () => ({
		...JSON.parse(componentDefaults)
	}),

    computed: {
        parsedLink () {
			// copy for manipulation
            let output = this.link;
			const form = [...this.form];

			// replace all variables with form data
            return output?.replace(REGEX_VARIABLES_ONLY, originalMatch => {
				const value = form.shift();
				return value || value === '' ? encodeURIComponent(value) : originalMatch;
			});
        },

		linkIsValid () {
			// setup
			let hasVariables = false;

			// exit if no link
			if (!this.parsedLink) { return false; }

			// check if the link has any variables
			const variables = this.parsedLink.matchAll(new RegExp(REGEX_VARIABLES_AND_FIELDS));
			for (const variable of variables) {
				hasVariables = true;
				break;
			}

			// valid if there are no variables AND the link is a valid URL
			return !hasVariables && isURL(this.parsedLink);
		},

        variables () {
			// setup
			const output = [];

			// find all variables in the link
			const variables = this.link.matchAll(new RegExp(REGEX_VARIABLES_AND_FIELDS));

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
					data.options = [];

					variable[3].split(`|`).forEach(option => {
						data.options.push({
							value: option,
							title: option || `{blank}`
						});
					});
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
			this.reset();
			this.link = link;
			this.open();
		});
	},

	methods: {
		close() {
			this.visible = false;
		},

		open() {
			this.visible = true;
		},

		reset() {
			Object.assign(this.$data, JSON.parse(componentDefaults));
		},

		launch() {
			window.eventBridge?.send(`launch-link`, this.parsedLink);
			this.close();
		},

		getFieldLabel(prefix, field) {
			return `${prefix}${field ? ` for "${field}" field` : ``}`;
		},

		pinDialogWidth() {
			// exit if dialog is not visible
			if (!this.visible) { return; }

			// set the width of the dialog + 1 to round up and prevent content jumping
			this.dialogWidth = document.querySelector(`.variables-modal-content`).offsetWidth + 1;
		},

		hideUi() {
			window.eventBridge?.send(`hide-ui`);
		}
	}
}
</script>

<style>
.parsed-link {
	word-break: break-all;
}
</style>