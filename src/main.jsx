import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { configured } from './lib/supabase';
import { Logo } from './ui/primitives';

function NotConfigured() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md"><Logo size="lg" />
        <h1 className="font-display text-2xl font-bold mt-6">Supabase isn't configured</h1>
        <p className="text-mute mt-2">Set <code className="text-lime">VITE_SUPABASE_URL</code> and <code className="text-lime">VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> (or in your host's environment settings) and restart.</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>{configured ? <App /> : <NotConfigured />}</React.StrictMode>);
