import { useState } from 'react';
import AuthContext from './AuthContext';
import type { Rol } from './AuthContext';
import { apiUrl } from '../config/env';

interface Props {
  children: React.ReactNode;
}

type LoginResponse = {
  token: string;
  usuario: {
    id: number | string;
    nombre: string;
    email: string;
    rol: 'tecnico' | 'coordinador';
  };
};

// Valida rol permitido para evitar valores raros
const asRol = (v: unknown): Rol => (v === 'tecnico' || v === 'coordinador' ? v : null);

const AuthProvider = ({ children }: Props) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [rol, setRol] = useState<Rol>(asRol(localStorage.getItem('rol')));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [id, setId] = useState<string | null>(localStorage.getItem('id'));

  const isAuthenticated = !!token;

  const clearAll = () => {
    setToken(null);
    setRol(null);
    setUsername(null);
    setId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('username');
    localStorage.removeItem('id');
  };

const login = async (email: string, password: string): Promise<void> => {
  const url = apiUrl('/auth/login'); // en PROD => /api/auth/login; en DEV => http://localhost:3001/auth/login
  console.log('POST', url);

  // Timeout defensivo (10s)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      signal: ctrl.signal,
      // Si usas cookies/sesiones en el backend, descomenta:
      // credentials: 'include',
    }).catch((e) => {
      console.error('Network/CORS error calling', url, e);
      throw new Error('Failed to fetch: no se pudo contactar al servidor (red/CORS).');
    });

    clearTimeout(timer);

    // Lee texto crudo y luego intenta JSON (para ver mensajes de error del backend)
    const raw = await resp.text();
    let data: Partial<LoginResponse> & { message?: string } = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { /* respuesta no-JSON */ }

    if (!resp.ok) {
      console.error('HTTP error', resp.status, raw);
      throw new Error(data?.message ?? `Error ${resp.status} al iniciar sesión`);
    }

    if (!data?.token || !data?.usuario) {
      console.error('Respuesta inesperada', data);
      throw new Error('Respuesta inválida del servidor (faltan token o usuario).');
    }

    const u = data.usuario;
    const rolOk = asRol(u.rol);

    // Estado
    setToken(data.token);
    setRol(rolOk);
    setUsername(u.nombre ?? null);
    setId(String(u.id));

    // Storage
    localStorage.setItem('token', data.token);
    rolOk ? localStorage.setItem('rol', rolOk) : localStorage.removeItem('rol');
    u.nombre ? localStorage.setItem('username', u.nombre) : localStorage.removeItem('username');
    localStorage.setItem('id', String(u.id));
  } catch (err) {
    clearAll();
    throw err instanceof Error ? err : new Error('Error desconocido al iniciar sesión');
  } finally {
    clearTimeout(timer);
  }
};

  const logout = (): void => {
    clearAll();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        rol,
        username,
        id,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
