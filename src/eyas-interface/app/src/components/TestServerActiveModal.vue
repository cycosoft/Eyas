<template>
	<ModalWrapper ref="modal" v-model="visible">
		<v-card>
			<v-card-title class="d-flex align-center justify-space-between text-title-large pt-3 px-3" data-qa="test-server-active-title">
				<span>Live Test Server</span>
				<v-chip
					v-if="(endTime || isExpired) && !isExpired"
					color="success"
					variant="flat"
					class="font-weight-bold"
					size="small"
				>
					{{ countdownText }}
				</v-chip>
			</v-card-title>

			<v-card-text class="overflow-y-auto px-3">
				<!-- Expired Alert -->
				<v-alert
					v-if="isExpired"
					type="error"
					variant="tonal"
					class="mb-4"
					data-qa="test-server-expired-alert"
				>
					<p class="mb-0">
						<strong>Session Expired</strong>
					</p>
					<p class="mb-0 text-body-medium">
						This session timed out after {{ duration }}.
					</p>
				</v-alert>

				<!-- Active Status Hint -->
				<v-alert
					v-else
					type="info"
					variant="tonal"
					class="mb-4"
				>
					<p class="mb-0">
						<strong>Session Active</strong>
					</p>
					<p class="mb-0 text-body-medium">
						Session expires at {{ formattedEndTime }}
					</p>
				</v-alert>

				<v-list density="compact">
					<!-- Server Address -->
					<v-list-item>
						<template #prepend>
							<v-icon>mdi-earth</v-icon>
						</template>
						<v-list-item-title class="font-weight-bold">
							{{ isExpired ? 'Last session served at' : 'Test served at' }}
						</v-list-item-title>
						<v-list-item-subtitle>{{ displayUrl }}</v-list-item-subtitle>
						<template #append>
							<div class="d-flex ga-1">
								<v-tooltip location="top" :text="tooltipText">
									<template #activator="{ props }">
										<v-btn
											v-bind="props"
											variant="text"
											icon
											size="small"
											color="primary"
											@click="copyDomain"
										>
											<v-icon :icon="copyIcon" />
										</v-btn>
									</template>
								</v-tooltip>

								<v-tooltip location="top" text="Open in Browser">
									<template #activator="{ props }">
										<v-btn
											v-bind="props"
											id="btn-open-in-browser"
											variant="text"
											icon
											size="small"
											:disabled="isExpired"
											@click="openInBrowser"
										>
											<v-icon icon="mdi-open-in-new" />
										</v-btn>
									</template>
								</v-tooltip>
							</div>
						</template>
					</v-list-item>

					<!-- Session Started -->
					<v-list-item v-if="startTime">
						<template #prepend>
							<v-icon>mdi-clock-outline</v-icon>
						</template>
						<v-list-item-title class="font-weight-bold">
							{{ isExpired ? 'Last session started at' : 'Session started at' }}
						</v-list-item-title>
						<v-list-item-subtitle>{{ formattedStartTime }}</v-list-item-subtitle>
					</v-list-item>
				</v-list>
			</v-card-text>

			<v-card-actions>
				<v-btn
					id="btn-extend-session"
					:disabled="!canExtend"
					color="primary"
					variant="text"
					class="text-lowercase"
					@click="extendSession"
				>
					extend +{{ extensionLabel }}
				</v-btn>
				<v-spacer />
				<v-btn
					id="btn-close-session"
					variant="flat"
					color="error"
					@click="stopServer"
				>
					End Session
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { IsVisible, DomainUrl, Timestamp, IconName, DurationString, TimerId, ChannelName, LabelString, TimeString, IsActive } from '@/../../../types/primitives.js';
import type { ModalWrapperVM } from '@/../../../types/components.js';
import { formatDisplayUrl, formatTimestamp, calculateCountdownText, getExtensionLabel, checkCanExtend } from './TestServerActiveModal.utils.js';

// State
const visible = ref<IsVisible>(false);
const domain = ref<DomainUrl>(``);
const startTime = ref<Timestamp | null>(null);
const endTime = ref<Timestamp | null>(null);
const copyIcon = ref<IconName>(`mdi-content-copy`);
const isExpired = ref<IsActive>(false);
const duration = ref<DurationString>(``);
const now = ref<Timestamp>(Date.now());
const timerInterval = ref<TimerId | null>(null);
const modal = ref<ModalWrapperVM | null>(null);

// Watchers
watch(isExpired, () => {
	nextTick(() => {
		modal.value?.pinDialogWidth();
	});
});

// Computed
const tooltipText = computed<LabelString>(() => copyIcon.value === `mdi-check` ? `Copied!` : `Copy URL`);
const formattedStartTime = computed<TimeString>(() => formatTimestamp(startTime.value));
const formattedEndTime = computed<TimeString>(() => formatTimestamp(endTime.value));
const countdownText = computed<TimeString>(() => calculateCountdownText(endTime.value, now.value));
const displayUrl = computed<DomainUrl>(() => formatDisplayUrl(domain.value));
const extensionLabel = computed<LabelString>(() => getExtensionLabel());
const canExtend = computed<IsActive>(() => checkCanExtend(isExpired.value, endTime.value, now.value));

// Methods
const stopTimer = (): void => {
	if (timerInterval.value) {
		clearInterval(timerInterval.value);
		timerInterval.value = null;
	}
};

const startTimer = (): void => {
	stopTimer();
	timerInterval.value = setInterval(() => {
		now.value = Date.now();
		if (now.value >= (endTime.value || 0)) {
			stopTimer();
		}
	}, 1000);
};

const copyDomain = (): void => {
	navigator.clipboard.writeText(domain.value);
	copyIcon.value = `mdi-check`;
	setTimeout(() => {
		copyIcon.value = `mdi-content-copy`;
	}, 2000);
};

const close = (): void => {
	stopTimer();
	visible.value = false;
	// Reset state
	domain.value = ``;
	startTime.value = null;
	endTime.value = null;
	copyIcon.value = `mdi-content-copy`;
	isExpired.value = false;
	duration.value = ``;
};

const stopServer = (): void => {
	window.eyas?.send(`test-server-stop` as ChannelName);
	close();
};

const openInBrowser = (): void => {
	window.eyas?.send(`test-server-open-browser` as ChannelName, domain.value);
};

const extendSession = (): void => {
	window.eyas?.send(`test-server-extend` as ChannelName);
};

// Lifecycle & Listeners
onMounted(() => {
	window.eyas?.receive(`show-test-server-active-modal` as ChannelName, payload => {
		domain.value = payload.domain || ``;
		startTime.value = payload.startTime || null;
		endTime.value = payload.endTime || null;
		isExpired.value = false;
		visible.value = true;

		now.value = Date.now();
		if (endTime.value) {
			startTimer();
		}
	});

	window.eyas?.receive(`show-test-server-resume-modal` as ChannelName, payloadDuration => {
		duration.value = payloadDuration || `the session limit`;
		isExpired.value = true;
		visible.value = true;
		stopTimer();
	});
});

onBeforeUnmount(() => {
	stopTimer();
});

// Expose for tests (VM Integrity)
defineExpose({
	visible,
	domain,
	isExpired,
	displayUrl,
	extensionLabel,
	copyIcon,
	openInBrowser,
	stopServer,
	copyDomain
});
</script>


<style scoped>
</style>
