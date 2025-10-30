import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import RegistroExpediente from '../pages/RegistroExpedientes';
import RevisarExpedientes from '../pages/RevisarExpedientes';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';
import Login from '../pages/Login';
import useAuth from '../auth/useAuth';
import ExpedienteForm from '../components/ExpedienteForm';
import RegistroIndicio from '../pages/RegistroIndicio';
import IndicioForm from '../components/IndicioForm';
import ReporteExpedientes from '../pages/ReporteExpedientes';
import ReporteIndicios from '../pages/ReporteIndicios';
import ReporteAprobacionesRechazos from '../pages/ReporteAprobacionesRechazos';

// NUEVO: páginas de usuarios (ajusta las rutas si tus archivos tienen otros nombres)
import RegistroUsuarios from '../pages/RegistroUsuario';
import CrearUsuario from '../components/UsuarioForm';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Raíz: Home si autenticado, si no Login */}
      <Route
        path="/"
        element={isAuthenticated ? <Home /> : <Navigate to="/login" />}
      />

      <Route path="/login" element={<Login />} />

      {/* Expedientes */}
      <Route
        path="/expediente"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['tecnico']}>
              <RegistroExpediente />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/expediente-form"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['tecnico']}>
              <ExpedienteForm />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Indicios */}
      <Route
        path="/indicio"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['tecnico']}>
              <RegistroIndicio />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/indicio-form"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['tecnico']}>
              <IndicioForm />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Coordinador */}
      <Route
        path="/revisar"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['coordinador']}>
              <RevisarExpedientes />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Reportes */}
      <Route
        path="/reporte-indicios"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['coordinador', 'tecnico']}>
              <ReporteIndicios />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/reporte-aprobaciones"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['coordinador', 'tecnico']}>
              <ReporteAprobacionesRechazos />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/reporte-expedientes"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['coordinador', 'tecnico']}>
              <ReporteExpedientes />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* NUEVO: Usuarios */}
      <Route
        path="/usuarios"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['coordinador']}>
              <RegistroUsuarios />
            </RoleRoute>
          </PrivateRoute>
        }
      />
      <Route
        path="/usuarios/crear"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['coordinador']}>
              <CrearUsuario />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Comodín: si no hay sesión => /login, si hay => / */}
      <Route
        path="*"
        element={isAuthenticated ? <Navigate to="/" /> : <Navigate to="/login" />}
      />
    </Routes>
  );
};

export default AppRoutes;
