<template>
	<ModalWrapper
		v-model="visible"
		@keyup.esc="close"
	>
		<v-card class="pa-3 variables-modal-content">
			<v-card-text class="pb-0">
				<p class="font-weight-black text-center text-title-large">
					Link Requires Additional Information
				</p>

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
								v-for="(option, optIndex) in [`false`, `true`]"
								:key="optIndex"
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
					<v-row class="pt-2">
						<v-icon v-if="linkIsValid" class="mr-2" color="success">
							mdi-check-circle-outline
						</v-icon>
						<v-icon v-else class="mr-2" color="error">
							mdi-alert-rhombus-outline
						</v-icon>
						<small class="parsed-link">{{ parsedLink }}</small>
					</v-row>
				</v-sheet>

				<!-- Error for missing link data state -->
				<v-sheet v-else class="mt-10 mb-4 text-center">
					<v-icon class="mr-2" color="error">
						mdi-alert-rhombus-outline
					</v-icon>
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
	</ModalWrapper>
</template>

<script lang="ts">
import ModalWrapper from '@/components/ModalWrapper.vue';
import isURL from 'validator/lib/isURL';
import type { IsVisible, DomainUrl, LabelString, ChannelName, VariableValue, VariableType, FieldName, IsActive } from '@/../../../types/primitives.js';

const REGEX_VARIABLES_AND_FIELDS = /([?|&](\w*)=)?{([^{}]+)}/g;
const REGEX_VARIABLES_ONLY = /{([^{}]+)}/g;

const componentDefaults = JSON.stringify({
	visible: false,
	link: ``, // `https://{dev.|staging.|}cycosoft.com?id={int}&message={str}&enabled={bool}`,
	form: []
});

type VariableOption = {
	value: VariableValue;
	title: LabelString;
}

type VariableDescriptor = {
	type: VariableType;
	field?: FieldName;
	options?: VariableOption[];
}

type VariablesModalState = {
	visible: IsVisible;
	link: DomainUrl;
	form: VariableValue[];
}

export default {
	components: {
		ModalWrapper
	},

	data: (): VariablesModalState => ({
		...JSON.parse(componentDefaults)
	}),

	computed: {
		parsedLink (): LabelString {
			// copy for manipulation
			const output = this.link;
			const form = [...this.form];

			// replace all variables with form data
			return output?.replace(REGEX_VARIABLES_ONLY, originalMatch => {
				const value = form.shift();
				return value || value === `` ? encodeURIComponent(value) : originalMatch;
			});
		},

		linkIsValid (): IsActive {
			// setup
			let hasVariables = false;

			// exit if no link
			if (!this.parsedLink) { return false; }

			// check if the link has any variables
			const variables = this.parsedLink.matchAll(new RegExp(REGEX_VARIABLES_AND_FIELDS));
			for (const _ of variables) {
				hasVariables = true;
				break;
			}

			// valid if there are no variables AND the link is a valid URL
			return !hasVariables && isURL(this.parsedLink);
		},

		variables (): VariableDescriptor[] {
			// setup
			const output: VariableDescriptor[] = [];

			// find all variables in the link
			const variables = this.link.matchAll(new RegExp(REGEX_VARIABLES_AND_FIELDS));

			// for each variable found
			for (const variable of variables) {
				// setup
				const data: VariableDescriptor = { type: `` as VariableType };
				const type = variable[3];
				const isList = variable[3].includes(`|`);
				const hasField = variable[2];

				// skip Eyas-managed variables (underscore prefix = app-defined, not user-input)
				if (type.startsWith(`_`)) { continue; }

				// populate the data object
				data.type = (isList ? `list` : type) as VariableType;

				// add the field if it exists
				if (hasField) {
					data.field = variable[2] as FieldName;
				}

				// add the options or label
				if(isList) {
					data.options = [];

					variable[3].split(`|`).forEach(option => {
						data.options?.push({
							value: option as VariableValue,
							title: (option || `{blank}`) as LabelString
						});
					});
				}

				// push the data object to the output
				output.push(data);
			}

			return output;
		}
	},

	mounted(): void {
		// Listen for messages from the main process
		window.eyas?.receive(`show-variables-modal` as ChannelName, link => {
			this.reset();
			this.link = link;
			this.open();
		});
	},

	methods: {
		close(): void {
			this.visible = false;
		},

		open(): void {
			this.visible = true;
		},

		reset(): void {
			Object.assign(this.$data, JSON.parse(componentDefaults));
		},

		launch(): void {
			window.eyas?.send(`launch-link` as ChannelName, { url: this.parsedLink });
			this.close();
		},

		getFieldLabel(prefix: LabelString, field?: FieldName): LabelString {
			return `${prefix}${field ? ` for "${field}" field` : ``}`;
		}
	}
};
</script>

<style>
.parsed-link {
	word-break: break-all;
}
</style>