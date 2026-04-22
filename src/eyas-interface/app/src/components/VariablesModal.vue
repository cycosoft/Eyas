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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import isURL from 'validator/lib/isURL';
import type { IsVisible, DomainUrl, LabelString, ChannelName, VariableValue, VariableType, FieldName, IsActive } from '@/../../../types/primitives.js';

const REGEX_VARIABLES_AND_FIELDS = /([?|&](\w*)=)?{([^{}]+)}/g;
const REGEX_VARIABLES_ONLY = /{([^{}]+)}/g;

type VariableOption = {
	value: VariableValue;
	title: LabelString;
}

type VariableDescriptor = {
	type: VariableType;
	field?: FieldName;
	options?: VariableOption[];
}

const visible = ref<IsVisible>(false);
const link = ref<DomainUrl>(``);
const form = ref<VariableValue[]>([]);

const parsedLink = computed((): LabelString => {
	// copy for manipulation
	const output = link.value;
	const formData = [...form.value];

	// replace all variables with form data
	return output?.replace(REGEX_VARIABLES_ONLY, originalMatch => {
		const value = formData.shift();
		return value || value === `` ? encodeURIComponent(value) : originalMatch;
	}) as LabelString;
});

const linkIsValid = computed((): IsActive => {
	// setup
	let hasVariables = false;

	// exit if no link
	if (!parsedLink.value) { return false; }

	// check if the link has any variables
	const matches = parsedLink.value.matchAll(new RegExp(REGEX_VARIABLES_AND_FIELDS));
	for (const _ of matches) {
		hasVariables = true;
		break;
	}

	// valid if there are no variables AND the link is a valid URL
	return !hasVariables && isURL(parsedLink.value);
});

const variables = computed((): VariableDescriptor[] => {
	// setup
	const output: VariableDescriptor[] = [];

	// find all variables in the link
	const matches = link.value.matchAll(new RegExp(REGEX_VARIABLES_AND_FIELDS));

	// for each variable found
	for (const match of matches) {
		// setup
		const data: VariableDescriptor = { type: `` as VariableType };
		const type = match[3];
		const isList = match[3].includes(`|`);
		const hasField = match[2];

		// skip Eyas-managed variables (underscore prefix = app-defined, not user-input)
		if (type.startsWith(`_`)) { continue; }

		// populate the data object
		data.type = (isList ? `list` : type) as VariableType;

		// add the field if it exists
		if (hasField) {
			data.field = match[2] as FieldName;
		}

		// add the options or label
		if (isList) {
			data.options = [];

			match[3].split(`|`).forEach(option => {
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
});

const close = (): void => {
	visible.value = false;
};

const open = (): void => {
	visible.value = true;
};

const reset = (): void => {
	visible.value = false;
	link.value = ``;
	form.value = [];
};

const launch = (): void => {
	window.eyas?.send(`launch-link` as ChannelName, { url: parsedLink.value });
	close();
};

const getFieldLabel = (prefix: LabelString, field?: FieldName): LabelString => {
	return `${prefix}${field ? ` for "${field}" field` : ``}`;
};

onMounted(() => {
	window.eyas?.receive(`show-variables-modal` as ChannelName, (newLink: DomainUrl) => {
		reset();
		link.value = newLink;
		open();
	});
});

defineExpose({
	visible,
	link,
	form,
	parsedLink,
	linkIsValid,
	variables,
	close,
	open,
	reset,
	launch,
	getFieldLabel
});
</script>

<style>
.parsed-link {
	word-break: break-all;
}
</style>