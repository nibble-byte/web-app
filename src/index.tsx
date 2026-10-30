import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/weather" replace />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)

reportWebVitals()