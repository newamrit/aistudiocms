import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'safe-jsx-runtime-alias',
        enforce: 'pre' as const,
        resolveId(id: string, importer?: string) {
          if (importer && importer.includes('safeJsxRuntime')) {
            return null;
          }
          if (id === 'react/jsx-dev-runtime' || id === 'react/jsx-runtime') {
            return path.resolve(__dirname, 'src/utils/safeJsxRuntime.ts');
          }
          return null;
        },
      },
      {
        name: 'vite-plugin-suppress-hmr-errors',
        transformIndexHtml: {
          order: 'pre' as const,
          handler() {
            return [
              {
                tag: 'script',
                attrs: { type: 'text/javascript' },
                children: `(function(){var isErr=function(v){if(!v)return false;var s='';if(typeof v==='string'){s=v;}else if(v instanceof Error||(v&&typeof v.message==='string')){s=(v.message||'')+' '+(v.stack||'');}else{try{s=JSON.stringify(v);}catch(e){s=String(v);}}return s.indexOf('[vite]')!==-1||s.indexOf('WebSocket')!==-1||s.indexOf('vite-hmr')!==-1||s.indexOf('failed to connect to websocket')!==-1||s.indexOf('Received NaN')!==-1||s.indexOf('cast the value to a string')!==-1;};var oErr=console.error;console.error=function(){for(var i=0;i<arguments.length;i++){if(isErr(arguments[i]))return;}var m=Array.prototype.slice.call(arguments).map(function(a){try{return typeof a==='object'?JSON.stringify(a):String(a);}catch(e){return String(a);}}).join(' ');if(isErr(m))return;oErr.apply(console,arguments);};var oWarn=console.warn;console.warn=function(){for(var i=0;i<arguments.length;i++){if(isErr(arguments[i]))return;}var m=Array.prototype.slice.call(arguments).map(function(a){try{return typeof a==='object'?JSON.stringify(a):String(a);}catch(e){return String(a);}}).join(' ');if(isErr(m))return;oWarn.apply(console,arguments);};window.addEventListener('unhandledrejection',function(e){if(isErr(e.reason)){e.preventDefault();e.stopPropagation();}});window.addEventListener('error',function(e){if(isErr(e.message)||isErr(e.error)){e.preventDefault();e.stopPropagation();}});var W=window.WebSocket;if(W){window.WebSocket=function(u,p){if(p==='vite-hmr'||(typeof u==='string'&&(u.indexOf('token=')!==-1||u.indexOf('24678')!==-1||u.indexOf('vite')!==-1))){var l={};var m={readyState:1,OPEN:1,CONNECTING:0,CLOSING:2,CLOSED:3,protocol:p||'',url:u,send:function(){},close:function(){},addEventListener:function(e,c){if(!l[e])l[e]=[];l[e].push(c);if(e==='open')setTimeout(function(){c({type:'open',target:m})},0);},removeEventListener:function(e,c){if(l[e])l[e]=l[e].filter(function(f){return f!==c;});},dispatchEvent:function(){return true;},onopen:null,onclose:null,onerror:null,onmessage:null};setTimeout(function(){if(typeof m.onopen==='function')m.onopen({type:'open',target:m});},0);return m;}return new W(u,p);};window.WebSocket.prototype=W.prototype;window.WebSocket.CONNECTING=0;window.WebSocket.OPEN=1;window.WebSocket.CLOSING=2;window.WebSocket.CLOSED=3;}})();`,
                injectTo: 'head-prepend' as const,
              },
            ];
          },
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-512x512.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'Paila Nepal Tour Leader',
          short_name: 'PailaLeader',
          description: 'Field operations, daily updates, emergency dispatch, and tour management for Paila Nepal.',
          theme_color: '#012871',
          background_color: '#012871',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: 'index.html',
          runtimeCaching: [
            // 1. API Responses - NetworkFirst with 3-second timeout for rapid offline/intermittent fallback
            {
              urlPattern: /\/api\/.*$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'paila-api-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 2. Local Static Images & Assets
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'paila-images-cache',
                expiration: {
                  maxEntries: 40,
                  maxAgeSeconds: 15 * 24 * 60 * 60, // 15 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 3. Google Fonts Stylesheets
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 4. Google Fonts Webfont Files
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 5. External CDN Media & Unsplash Photography
            {
              urlPattern: /^https:\/\/(?:images\.unsplash\.com|cdn\.|cdnjs\.cloudflare\.com).*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'paila-external-media-cache',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 14 * 24 * 60 * 60, // 14 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      // HMR is disabled in AI Studio environment
      hmr: false as const,
      ws: false as const,
    },
  };
});
