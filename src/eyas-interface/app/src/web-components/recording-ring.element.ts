export const RECORDING_RING_TAG = `recording-ring`;

const TEMPLATE = document.createElement(`template`);
TEMPLATE.innerHTML = `
	<style>
		:host {
			display: block;
			overflow: hidden;
		}
		svg {
			width: 100%;
			height: 100%;
		}
		.glow {
			fill: none;
			stroke: url(#recording-ring-gradient);
			vector-effect: non-scaling-stroke;
		}
		.glow--outer {
			stroke-width: 26;
			opacity: 0.6;
			filter: url(#recording-ring-turbulence) blur(9px);
		}
		.glow--core {
			stroke-width: 8;
			opacity: 1;
			filter: url(#recording-ring-turbulence) blur(1.5px);
		}
	</style>
	<svg>
		<defs>
			<filter
				id="recording-ring-turbulence"
				x="-20%"
				y="-20%"
				width="140%"
				height="140%"
			>
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.01 0.025"
					numOctaves="3"
					seed="7"
					result="noise"
				>
					<animate
						attributeName="baseFrequency"
						values="0.008 0.02;0.014 0.03;0.009 0.022;0.008 0.02"
						dur="19s"
						repeatCount="indefinite"
					/>
				</feTurbulence>
				<feDisplacementMap
					in="SourceGraphic"
					in2="noise"
					scale="10"
					xChannelSelector="R"
					yChannelSelector="G"
				/>
			</filter>

			<linearGradient
				id="recording-ring-gradient"
				gradientUnits="objectBoundingBox"
			>
				<stop offset="0%" style="stop-color: var(--recording-ring-color-1)">
					<animate attributeName="stop-opacity" values="0.7;1;0.8;1;0.7" dur="9s" repeatCount="indefinite" />
				</stop>
				<stop offset="35%" style="stop-color: var(--recording-ring-color-2)">
					<animate attributeName="stop-opacity" values="1;0.7;1;0.8;1" dur="13s" repeatCount="indefinite" />
				</stop>
				<stop offset="65%" style="stop-color: var(--recording-ring-color-3)">
					<animate attributeName="stop-opacity" values="0.8;1;0.7;1;0.8" dur="11s" repeatCount="indefinite" />
				</stop>
				<stop offset="100%" style="stop-color: var(--recording-ring-color-1)">
					<animate attributeName="stop-opacity" values="1;0.8;1;0.7;1" dur="17s" repeatCount="indefinite" />
				</stop>
				<animateTransform
					attributeName="gradientTransform"
					type="rotate"
					from="0 0.5 0.5"
					to="360 0.5 0.5"
					dur="34s"
					repeatCount="indefinite"
				/>
			</linearGradient>
		</defs>

		<rect class="glow glow--outer" x="0" y="0" width="100%" height="100%" />
		<rect class="glow glow--core" x="0" y="0" width="100%" height="100%" />
	</svg>
`;

class RecordingRingElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({ mode: `open` });
		shadow.appendChild(TEMPLATE.content.cloneNode(true));
	}
}

export function defineRecordingRingElement(): void {
	if (!customElements.get(RECORDING_RING_TAG)) {
		customElements.define(RECORDING_RING_TAG, RecordingRingElement);
	}
}
