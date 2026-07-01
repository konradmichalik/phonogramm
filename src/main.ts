import '@fontsource/anton/latin-400.css'
import '@fontsource/archivo/latin-400.css'
import '@fontsource/archivo/latin-500.css'
import '@fontsource/archivo/latin-600.css'
import '@fontsource/archivo/latin-700.css'
import './styles.css'
import { mountApp } from './ui/app'

mountApp(document.querySelector<HTMLDivElement>('#app')!)
