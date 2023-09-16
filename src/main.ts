import { createApp } from "vue";
import { createPinia } from "pinia";
import { pluralize } from "./pluralize";
import { humanize } from "./humanize";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// Apply pluralize as a global filter.
app.config.globalProperties.$filters = { pluralize, humanize };

app.mount("#app");
