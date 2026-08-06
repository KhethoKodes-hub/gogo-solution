import { defineNuxtConfig } from 'nuxt/config';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  workspaceDir: '../../',
  compatibilityDate: '2026-08-01',
  app: {
    head: {
      link: [
        { rel: 'shortcut icon', type: 'image/x-icon', href: '/assets/img/gogologo.png' },
        { rel: 'stylesheet', href: '/assets/css/bootstrap.min.css' },
        { rel: 'stylesheet', href: '/assets/css/animate.min.css' },
        { rel: 'stylesheet', href: '/assets/css/keyframe-animation.css' },
        { rel: 'stylesheet', href: '/assets/lib/font-awesome-pro/css/fontawesome.min.css' },
        { rel: 'stylesheet', href: '/assets/css/logistic-icons.min.css' },
        { rel: 'stylesheet', href: '/assets/css/odometer.min.css' },
        { rel: 'stylesheet', href: '/assets/css/nice-select.css' },
        { rel: 'stylesheet', href: '/assets/css/swiper.min.css' },
        { rel: 'stylesheet', href: '/assets/css/venobox.min.css' },
        { rel: 'stylesheet', href: '/assets/css/slider.css' },
        { rel: 'stylesheet', href: '/assets/css/common-style.css' },
        { rel: 'stylesheet', href: '/assets/css/main.css' },
      ],
      script: [
        { src: '/assets/js/vendor/jquary-3.6.0.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/modernizr-2.8.3-respond-1.4.2.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/bootstrap.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/popper.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/lib/gsap/gsap.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/lib/gsap/ScrollTrigger.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/lib/gsap/split-type.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/lenis.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/odometer.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/jquery.nice-select.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/waypoints.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/venobox.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/swiper.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/vendor/wow.min.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/mailchimp.js', tagPosition: 'bodyClose' },
        { src: '/assets/js/quote-form.js', tagPosition: 'bodyClose' },
        { children: 'window.__NUXT_MANAGED_SWIPERS = true;', tagPosition: 'bodyClose' },
        { src: '/assets/js/main.js', tagPosition: 'bodyClose' },
      ],
    },
  },
  devtools: { enabled: true },
  devServer: {
    host: process.env.NUXT_HOST || 'localhost',
    port: Number(process.env.NUXT_PORT || 4200),
  },
  typescript: {
    typeCheck: false,
    tsConfig: {
      extends: '../../../tsconfig.base.json', // Nuxt copies this string as-is to the `./.nuxt/tsconfig.json`, therefore it needs to be relative to that directory
    },
  },
  imports: {
    autoImport: true,
  },
  css: [],
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
      enableManagedForms: process.env.NUXT_ENABLE_MANAGED_FORMS !== 'false',
    },
  },
  vite: {
    resolve: {
      tsconfigPaths: true,
    },
  },
});
