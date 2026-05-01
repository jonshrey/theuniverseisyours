import { Universe3D } from './universe/components/Universe3D';
import { CosmicInput } from './universe/components/CosmicInput';
import { FavoritesLoader } from './universe/components/FavoritesLoader';
import { PlanetCardOverlay } from './universe/components/PlanetCardOverlay';
import './App.css';

function App() {
  return (
    <main className="app-shell">
      <FavoritesLoader />
      <Universe3D />
      <CosmicInput />
      <PlanetCardOverlay />
    </main>
  );
}

export default App;