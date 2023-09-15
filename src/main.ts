import { createApp } from "vue";
import { createPinia } from "pinia";
import { store } from "./store";
import { pluralize } from "./pluralize";
import { humanize } from "./humanize";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(store);

// Apply pluralize as a global filter.
app.config.globalProperties.$filters = {};
app.config.globalProperties.$filters.pluralize = pluralize;
app.config.globalProperties.$filters.humanize = humanize;

app.mount("#app");
