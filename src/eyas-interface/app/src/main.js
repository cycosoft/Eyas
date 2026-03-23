import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';

// Vuetify
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';

// create a new app instance to work with
const app = createApp(App);

// attach imports to the app instance
app.use(createPinia());
app.use(createVuetify());

// mount the app to the html
app.mount(`#app`);
