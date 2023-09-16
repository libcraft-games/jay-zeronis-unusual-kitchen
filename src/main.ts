import { createApp } from "vue";
import { createPinia } from "pinia";
import { pluralize } from "./pluralize";
import { humanize } from "./humanize";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);

// Apply pluralize as a global filter.
app.config.globalProperties.$filters = { pluralize, humanize };

app.mount("#app");
