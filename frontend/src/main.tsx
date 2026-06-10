import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/tiptap/styles.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const theme = createTheme({
  primaryColor: 'brand',
  defaultRadius: 'md',
  colors: {
    brand: [
      '#fce8f2', // 0
      '#f5c4e1', // 1
      '#e896ca', // 2
      '#d966ae', // 3
      '#c43d90', // 4
      '#a62475', // 5
      '#80345e', // 6 ← hoofdkleur
      '#65284b', // 7
      '#4a1c36', // 8
      '#2f1021', // 9
    ],
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
