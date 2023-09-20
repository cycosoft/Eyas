import { createApp } from 'vue';
import App from '@/App.vue';
// import router from '@/router';

// Vuetify
// import 'vuetify/styles';
// import { createVuetify } from 'vuetify';

// create a new app instance
const app = createApp(App);

// attach the router and vuetify to the app
// app.use(router);
// app.use(createVuetify());

// mount the app to the html
app.mount(`#app`);
