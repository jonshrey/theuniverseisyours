import { AccretionDiskCanvas } from './universe/components/AccretionDiskCanvas';
import { CosmicInput } from './universe/components/CosmicInput';
import './App.css';

function App() {
  return (
    <main className="app-shell">
      {/* Full‑screen animated universe */}
      <AccretionDiskCanvas />

      {/* Transparent text input on top */}
      <CosmicInput />
    </main>
  );
}

export default App;