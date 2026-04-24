<template>
	<v-overlay class="custom-background" :model-value="modelValue" :scrim="true">
		<template v-if="contentVisible">
			<div class="bottom-right">
				<span class="cursor-pointer" @click="openInBrowser(`https://cycosoft.com`)">
					<img
						class="logo"
						alt="Cycosoft, LLC logo"
						src="@/assets/cycosoft-logo.svg"
					>
				</span>
			</div>
		</template>
	</v-overlay>

	<slot />
</template>

<script setup lang="ts">
import type { ModalBackgroundProps } from '@/../../../types/components.js';
import type { DomainUrl, ChannelName } from '@/../../../types/primitives.js';

defineProps<ModalBackgroundProps>();

const openInBrowser = (url: DomainUrl): void => {
	window.eyas?.send(`launch-link` as ChannelName, { url, openInBrowser: true });
};
</script>

<style scoped lang="scss">
.custom-background:deep(.v-overlay__content){
	width: 100%;
	height: 100%;

	// disable highlighting of background content
	user-select: none;

	.bottom-right {
		display: flex;
		height: 100%;
		align-items: flex-end;
		justify-content: flex-end;
	}

	.logo {
		margin-right: 1.5rem;
		margin-bottom: 0.5rem;
		width: 175px;
	}
}
</style>