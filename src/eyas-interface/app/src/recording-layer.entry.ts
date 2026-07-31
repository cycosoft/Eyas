import { defineRecordingRingElement, RECORDING_RING_TAG } from './web-components/recording-ring.element.js';

defineRecordingRingElement();
document.body.appendChild(document.createElement(RECORDING_RING_TAG));
