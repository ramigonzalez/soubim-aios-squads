import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import App from './App'
import './design-system/fonts'
import './design-system/tokens.css'
import './design-system/motion.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
