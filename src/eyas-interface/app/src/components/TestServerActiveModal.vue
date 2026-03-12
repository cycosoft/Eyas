<template>
	<ModalWrapper ref="modal" v-model="visible">
		<v-card class="pa-3">
			<v-card-title class="d-flex align-center justify-space-between text-h6" data-qa="test-server-active-title">
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

			<v-card-text>
				<!-- Expired Alert -->
				<v-alert
					v-if="isExpired"
					type="error"
					variant="tonal"
					class="mb-4"
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
					class="mb-4"
				>
					<p class="mb-0"><strong>Session Active</strong></p>
					<p class="mb-0 text-body-2">Session expires at {{ formattedEndTime }}</p>
				</v-alert>

				<v-list density="compact">
					<!-- Server Address -->
					<v-list-item>
						<template v-slot:prepend>
							<v-icon>mdi-earth</v-icon>
						</template>
						<v-list-item-title class="font-weight-bold">{{ isExpired ? 'Last session served at' : 'Test served at' }}</v-list-item-title>
						<v-list-item-subtitle>{{ displayUrl }}</v-list-item-subtitle>
						<template v-slot:append>
							<div class="d-flex ga-1">
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

								<v-tooltip location="top" text="Open in Browser">
									<template v-slot:activator="{ props }">
										<v-btn
											v-bind="props"
											variant="text"
											icon
											size="small"
											:disabled="isExpired"
											id="btn-open-in-browser"
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
						<template v-slot:prepend>
							<v-icon>mdi-clock-outline</v-icon>
						</template>
						<v-list-item-title class="font-weight-bold">{{ isExpired ? 'Last session started at' : 'Session started at' }}</v-list-item-title>
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
					Close Session
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
			return this.copyIcon === 'mdi-check' ? 'Copied!' : 'Copy URL';
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
		displayUrl() {
			if (!this.domain) return '';
			try {
				const url = new URL(this.domain);
				// Hide port 90, 80 (http), 443 (https)
				const isHttp = url.protocol === 'http:';
				const isHttps = url.protocol === 'https:';
				const hidePorts = ['90'];
				if (isHttp && url.port === '80') hidePorts.push('80');
				if (isHttps && url.port === '443') hidePorts.push('443');

				// If port is empty string (because it's default for protocol), 
				// or if it's in our hidePorts list, we hide it.
				// Note: new URL('http://localhost:80').port is '80'
				// new URL('http://localhost').port is ''
				if (hidePorts.includes(url.port) || url.port === '') {
					return `${url.protocol}//${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
				}
				return this.domain;
			} catch (e) {
				return this.domain;
			}
		},
		extensionLabel() {
			const seconds = TEST_SERVER_SESSION_DURATION_MS / 1000;
			if (seconds >= 60 && seconds % 60 === 0) {
				return `${seconds / 60}m`;
			}
			return `${seconds}s`;
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
