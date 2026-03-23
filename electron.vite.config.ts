import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      viteStaticCopy({
        targets: [
          { src: 'src/eyas-assets/*', dest: '../eyas-assets' },
          { src: 'package.json', dest: '../' },
          { src: 'src/eyas-interface/splash.html', dest: '../eyas-interface' },
          { src: 'src/eyas-core/menu-template.js', dest: './' },
          { src: 'src/eyas-core/update-dialog.js', dest: './' },
          { src: 'src/eyas-core/metrics-events.js', dest: './' },
          { src: 'src/eyas-core/settings-service.js', dest: './' },
          { src: 'src/eyas-core/deep-link-handler.js', dest: './' },
          { src: 'src/eyas-core/test-server', dest: './' }
        ]
      })
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/eyas-core/index.js'),
          'menu-template': resolve(__dirname, 'src/eyas-core/menu-template.js'),
          'update-dialog': resolve(__dirname, 'src/eyas-core/update-dialog.js'),
          'metrics-events': resolve(__dirname, 'src/eyas-core/metrics-events.js'),
          'settings-service': resolve(__dirname, 'src/eyas-core/settings-service.js'),
          'deep-link-handler': resolve(__dirname, 'src/eyas-core/deep-link-handler.js'),
          'test-server/test-server': resolve(__dirname, 'src/eyas-core/test-server/test-server.js'),
          'test-server/test-server-certs': resolve(__dirname, 'src/eyas-core/test-server/test-server-certs.js'),
          'test-server/test-server-timeout': resolve(__dirname, 'src/eyas-core/test-server/test-server-timeout.js')
        },
        external: [/^..\/scripts\//, /^..\/..\/package\.json$/]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          'get-roots': resolve(__dirname, 'src/scripts/get-roots.js'),
          'get-config': resolve(__dirname, 'src/scripts/get-config.js'),
          'get-app-title': resolve(__dirname, 'src/scripts/get-app-title.js'),
          constants: resolve(__dirname, 'src/scripts/constants.js'),
          'event-bridge': resolve(__dirname, 'src/scripts/event-bridge.js'),
          'test-preload': resolve(__dirname, 'src/scripts/test-preload.js'),
          'parse-url': resolve(__dirname, 'src/scripts/parse-url.js'),
          'path-utils': resolve(__dirname, 'src/scripts/path-utils.js'),
          'time-utils': resolve(__dirname, 'src/scripts/time-utils.js'),
          'variable-utils': resolve(__dirname, 'src/scripts/variable-utils.js')
        }
      },
      outDir: 'out/scripts'
    }
  }
});
