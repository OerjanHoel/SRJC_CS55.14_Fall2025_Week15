import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Added the following import
import{ defineCustomElements } from '@ionic/pwa-elements/loader';

// Call the element loader after the app has been rendered the first time
defineCustomElements(window);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);