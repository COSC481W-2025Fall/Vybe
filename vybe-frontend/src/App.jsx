import { useEffect, useState } from 'react'
import { pingAPI } from './apiTest.js'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [msg, setMsg] = useState("...");

  useEffect(() => {
    pingAPI().then((data) => setMsg(JSON.stringify(data)));
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Vybe</h1>
      <p className="mt-2">Backend says: {msg}</p>
    </div>
  );
}

export default App
