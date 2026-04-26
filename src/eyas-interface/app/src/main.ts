import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';

// Vuetify
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';

// Vuetify
const vuetify = createVuetify({
	theme: {
		defaultTheme: `light`,
		themes: {
			light: {
				dark: false,
				colors: {
					primary: `#58A1D6`,
					'primary-container': `#4169e1`,
					secondary: `#D05454`,
					'secondary-container': `#dbe2fa`,
					surface: `#f7f9fb`,
					background: `#f7f9fb`,
					'on-surface': `#191c1e`,
					outline: `#74777f`,
					'outline-variant': `#c4c5d6`
				}
			}
		}
	}
});

// create a new app instance to work with
const app = createApp(App);

// attach imports to the app instance
app.use(createPinia());
app.use(vuetify);

// mount the app to the html
app.mount(`#app`);
