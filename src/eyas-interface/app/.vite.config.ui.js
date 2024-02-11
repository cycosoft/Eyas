import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default {
    base: `./`,
    plugins: [
        vue(),
        vuetify({ autoImport: true })
    ],
    root: resolve(__dirname),
    resolve: {
        alias: {
            'vue': `vue/dist/vue.esm-bundler.js`,
            '@': resolve(__dirname, `src`)
        }
    }
}