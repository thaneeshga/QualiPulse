import React from 'react'; import ReactDOM from 'react-dom/client'; import App from './App'; import { AuthGate } from './auth'; import ErrorBoundary from './ErrorBoundary'; import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(<ErrorBoundary><AuthGate><App /></AuthGate></ErrorBoundary>)
