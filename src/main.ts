import '@fontsource/anton/latin-400.css'
import '@fontsource/hanken-grotesk/latin-400.css'
import '@fontsource/hanken-grotesk/latin-600.css'
import '@fontsource/hanken-grotesk/latin-700.css'
import './styles.css'
import { mountApp } from './ui/app'

mountApp(document.querySelector<HTMLDivElement>('#app')!)
