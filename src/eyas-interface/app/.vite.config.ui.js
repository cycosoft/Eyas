import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';

export default {
    plugins: [vue()],
    root: resolve(__dirname),
    resolve: {
        alias: {
            'vue': 'vue/dist/vue.esm-bundler.js'
        }
    }
}