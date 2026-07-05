import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

if (navigator.storage?.persist) {
  void navigator.storage.persist();
}

const app = mount(App, { target: document.getElementById('app')! });

export default app;
