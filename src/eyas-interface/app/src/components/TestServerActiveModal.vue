<template>
	<ModalWrapper ref="modal" v-model="visible">
		<v-card class="pa-3">
			<!-- Header / Action bar with countdown -->
			<v-card-title class="d-flex align-center justify-space-between text-h6 text-primary">
				<span>Live Test Server</span>
				<v-chip
					v-if="endTime || isExpired"
					:color="isExpired ? 'error' : 'warning'"
					variant="flat"
					class="font-weight-bold"
					size="small"
				>
					{{ isExpired ? 'Session Expired' : `Session ends in ${countdownText} @ ${formattedEndTime}` }}
				</v-chip>
			</v-card-title>

			<v-card-text class="pt-4 pb-2">
				<!-- Server Address Info -->
				<div class="d-flex flex-column align-center justify-center py-6 mb-4 rounded-lg bg-surface-light border">
					<span class="text-subtitle-2 text-medium-emphasis mb-2">
						{{ isExpired ? 'Last session served at' : 'Test served at' }}
					</span>

					<v-tooltip location="top" :text="tooltipText">
						<template v-slot:activator="{ props }">
							<v-btn
								v-bind="props"
								variant="text"
								class="text-h5 font-weight-bold letter-spacing-1 text-none"
								:prepend-icon="copyIcon"
								@click="copyDomain"
							>
								{{ domain }}
							</v-btn>
						</template>
					</v-tooltip>
				</div>

				<!-- Session Start Time -->
				<div v-if="startTime" class="text-caption text-center text-medium-emphasis mt-4">
					<v-icon icon="mdi-clock-outline" size="small" class="mr-1"></v-icon>
					{{ isExpired ? 'Last session started at' : 'Session started at' }} {{ formattedStartTime }}
				</div>

				<!-- Expired Message -->
				<div v-if="isExpired" class="text-body-2 text-center text-error mt-4 font-weight-bold">
					This session has timed out after {{ duration }}.
				</div>
			</v-card-text>

			<v-divider class="my-3"></v-divider>

			<!-- Action Buttons -->
			<v-card-actions class="d-flex justify-center flex-wrap px-4 pb-4">
				<v-btn
					id="btn-close-session"
					color="error"
					variant="flat"
					class="flex-grow-1 mr-2"
					prepend-icon="mdi-stop-circle-outline"
					@click="stopServer"
				>
					Close Session
				</v-btn>

				<v-btn
					v-if="isExpired"
					id="btn-extend-session"
					color="success"
					variant="flat"
					class="flex-grow-1 mx-2"
					prepend-icon="mdi-plus-circle-outline"
					@click="extendSession"
				>
					Extend Session
				</v-btn>

				<v-btn
					id="btn-open-in-browser"
					:disabled="isExpired"
					color="primary"
					variant="flat"
					class="flex-grow-1 ml-2"
					prepend-icon="mdi-open-in-new"
					@click="openInBrowser"
				>
					Open in Browser
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script>
import ModalWrapper from '@/components/ModalWrapper.vue';

const defaults = {
	visible: false,
	domain: '',
	startTime: null,
	endTime: null,
	copyIcon: 'mdi-content-copy',
	isExpired: false,
	duration: ''
};

export default {
	components: {
		ModalWrapper
	},

	data: () => ({ ...defaults, now: Date.now(), timerInterval: null }),

	computed: {
		tooltipText() {
			return this.copyIcon === 'mdi-check' ? 'Copied!' : 'Click to copy';
		},
		formattedStartTime() {
			if (!this.startTime) return '';
			return new Date(this.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
		},
		formattedEndTime() {
			if (!this.endTime) return '';
			return new Date(this.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
		},
		countdownText() {
			if (!this.endTime) return '';
			const diff = Math.max(0, this.endTime - this.now);
			const mins = Math.floor(diff / 60000);
			const secs = Math.floor((diff % 60000) / 1000);
			return `${mins}m${secs}s`;
		}
	},

	watch: {
		isExpired() {
			this.$nextTick(() => {
				this.$refs.modal?.pinDialogWidth();
			});
		}
	},

	mounted() {
		window.eyas?.receive(`show-test-server-active-modal`, (payload) => {
			this.domain = payload.domain || '';
			this.startTime = payload.startTime || null;
			this.endTime = payload.endTime || null;
			this.isExpired = false;
			this.visible = true;

			this.now = Date.now();
			if (this.endTime) {
				this.startTimer();
			}
		});

		window.eyas?.receive(`show-test-server-resume-modal`, (duration) => {
			this.duration = duration || `the session limit`;
			this.isExpired = true;
			this.visible = true;
			this.stopTimer();
		});
	},

	beforeUnmount() {
		this.stopTimer();
	},

	methods: {
		startTimer() {
			this.stopTimer();
			this.timerInterval = setInterval(() => {
				this.now = Date.now();
				if (this.now >= this.endTime) {
					this.stopTimer();
				}
			}, 1000);
		},

		stopTimer() {
			if (this.timerInterval) {
				clearInterval(this.timerInterval);
				this.timerInterval = null;
			}
		},

		copyDomain() {
			navigator.clipboard.writeText(this.domain);
			this.copyIcon = 'mdi-check';
			setTimeout(() => {
				this.copyIcon = 'mdi-content-copy';
			}, 2000);
		},

		stopServer() {
			window.eyas?.send(`test-server-stop`);
			this.close();
		},

		openInBrowser() {
			window.eyas?.send(`test-server-open-browser`, this.domain);
		},

		extendSession() {
			window.eyas?.send(`test-server-extend`);
		},

		close() {
			this.stopTimer();
			this.visible = false;
			Object.assign(this.$data, defaults);
		}
	}
};
</script>

<style scoped>
.letter-spacing-1 {
	letter-spacing: 1px;
}
.bg-surface-light {
	background-color: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
