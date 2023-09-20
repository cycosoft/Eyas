import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default {
    plugins: [vue()],
    root: resolve(__dirname, `./src/eyas-interface/app`),
    resolve: {
        alias: {
            'vue': 'vue/dist/vue.esm-bundler.js'
        }
    }
}