import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';
import useAuth from './auth/useAuth';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div className="relative min-h-screen bg-gray-100">
        {/* Navbar y Footer SOLO si hay sesión */}
        {isAuthenticated && (
          <header className="fixed top-0 left-0 w-full z-50">
            <Navbar />
          </header>
        )}

        {/* Si no hay sesión, evita el padding del navbar fijo */}
        <main className={isAuthenticated ? 'pt-20 pb-16 px-4' : 'px-4 py-8'}>
          <AppRoutes />
        </main>

        {isAuthenticated && (
          <footer className="fixed bottom-0 left-0 w-full bg-blue-500 text-white py-3 text-center z-50">
            <p className="text-sm">
              © {new Date().getFullYear()} Desarrollado por Mvásquez | Tarea Sistema Gestiones
            </p>
          </footer>
        )}
      </div>
    </Router>
  );
}

export default App;
