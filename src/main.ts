import { createApp } from 'vue';
import App from './App.vue';
import 'uno.css';
import { getStore } from './sql';

const store = getStore();

async function runDb() {
  await store.ready;

  createApp(App).mount('#app');
}

void runDb();
