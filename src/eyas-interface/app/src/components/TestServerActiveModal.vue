<template>
	<ModalWrapper ref="modal" v-model="visible">
		<v-card class="pa-3">
			<v-card-title class="text-h6" data-qa="test-server-active-title">Live Test Server</v-card-title>

			<v-card-text>
				<p class="mb-4">Your live test server is currently managing a session.</p>

				<v-list density="compact">
					<!-- Server Address -->
					<v-list-item>
						<template v-slot:prepend>
							<v-icon>mdi-earth</v-icon>
						</template>
						<v-list-item-title class="font-weight-bold">{{ domain }}</v-list-item-title>
						<v-list-item-subtitle>{{ isExpired ? 'Last session served at' : 'Test served at' }}</v-list-item-subtitle>
						<template v-slot:append>
							<v-tooltip location="top" :text="tooltipText">
								<template v-slot:activator="{ props }">
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
						</template>
					</v-list-item>

					<!-- Session Started -->
					<v-list-item v-if="startTime">
						<template v-slot:prepend>
							<v-icon>mdi-clock-outline</v-icon>
						</template>
						<v-list-item-title>{{ formattedStartTime }}</v-list-item-title>
						<v-list-item-subtitle>{{ isExpired ? 'Last session started at' : 'Session started at' }}</v-list-item-subtitle>
					</v-list-item>

					<!-- Time Remaining -->
					<v-list-item v-if="endTime && !isExpired">
						<template v-slot:prepend>
							<v-icon color="warning">mdi-timer-sand</v-icon>
						</template>
						<v-list-item-title class="font-weight-bold text-warning">{{ countdownText }}</v-list-item-title>
						<v-list-item-subtitle>Session ends at {{ formattedEndTime }}</v-list-item-subtitle>
					</v-list-item>
				</v-list>

				<!-- Expired Alert -->
				<v-alert
					v-if="isExpired"
					type="error"
					variant="tonal"
					class="mt-4"
					data-qa="test-server-expired-alert"
				>
					<p class="mb-0"><strong>Session Expired</strong></p>
					<p class="mb-0 text-body-2">This session timed out after {{ duration }}.</p>
				</v-alert>

				<!-- Active Status Hint -->
				<v-alert
					v-else
					type="info"
					variant="tonal"
					class="mt-4"
				>
					<p class="mb-0"><strong>Session Active</strong></p>
					<p class="mb-0 text-body-2">Click extend to add more time to this session.</p>
				</v-alert>
			</v-card-text>

			<v-card-actions>
				<v-btn
					id="btn-close-session"
					variant="text"
					@click="stopServer"
				>
					Close Session
				</v-btn>
				<v-spacer />
				<v-btn
					id="btn-open-in-browser"
					:disabled="isExpired"
					@click="openInBrowser"
				>
					Open in Browser
				</v-btn>
				<v-btn
					id="btn-extend-session"
					:disabled="!canExtend"
					color="primary"
					variant="flat"
					@click="extendSession"
				>
					Extend Session
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script>
import ModalWrapper from '@/components/ModalWrapper.vue';
import { TEST_SERVER_SESSION_DURATION_MS } from '@/../../../scripts/constants.js';

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
		},
		canExtend() {
			if (this.isExpired) return true;
			if (!this.endTime) return false;
			return (this.endTime - this.now) < TEST_SERVER_SESSION_DURATION_MS;
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
</style>
