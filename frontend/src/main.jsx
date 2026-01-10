import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import {BrowserRouter} from 'react-router-dom'
import { Providers } from "./providers"

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <BrowserRouter>
      <Providers>
      <App />
      </Providers>
    </BrowserRouter>,
  )
}
