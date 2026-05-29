<template>
	<ModalWrapper v-model="visible" type="dialog" data-qa="save-credential-modal">
		<v-card>
			<v-card-title class="text-title-large pt-3 px-3" data-qa="save-credential-title">
				Save Credential
			</v-card-title>
			<v-card-text data-qa="save-credential-modal-text">
				<div>Do you want Eyas to remember this login for this project?</div>
				<v-sheet class="mt-3 pa-3 bg-grey-lighten-4 rounded" border>
					<div><strong>Origin:</strong> {{ credential?.origin }}</div>
					<div><strong>Username:</strong> {{ credential?.username }}</div>
				</v-sheet>
			</v-card-text>

			<v-card-actions class="mt-5">
				<v-btn data-qa="btn-cancel-save-credential" @click="cancel">
					No
				</v-btn>

				<v-spacer />

				<v-btn
					color="primary"
					variant="elevated"
					data-qa="btn-save-credential"
					@click="save"
				>
					Save
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { ChannelName, IsVisible } from '@/../../../types/primitives.js';

type CredentialPayload = {
	origin: string;
	username: string;
	passwordPlain: string;
};

const visible = ref<IsVisible>(false);
const credential = ref<CredentialPayload | null>(null);

const save = (): void => {
	if (credential.value) {
		window.eyas?.send(`save-credential-confirm` as ChannelName, credential.value);
	}
	visible.value = false;
};

const cancel = (): void => {
	visible.value = false;
};

onMounted(() => {
	window.eyas?.receive(`show-save-credential-modal` as ChannelName, (payload: unknown) => {
		credential.value = payload as CredentialPayload;
		visible.value = true;
	});
});

defineExpose({
	visible,
	credential,
	save,
	cancel
});
</script>
