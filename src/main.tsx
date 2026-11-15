import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// Self-hosted pixel font (OFL-1.1), bundled so the offline build needs no network.
import '@fontsource/press-start-2p/latin-400.css';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
