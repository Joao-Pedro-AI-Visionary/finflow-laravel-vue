import { createApp } from 'vue'
import { createPinia } from 'pinia'
import FinflowApp from './FinflowApp.vue'
import '../css/app.css'

const app = createApp(FinflowApp)
app.use(createPinia())
app.mount('#app')
