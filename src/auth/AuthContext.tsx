import { createContext } from 'react';

export type Rol = 'tecnico' | 'coordinador' | null;

export interface AuthContextType {
    isAuthenticated: boolean;
    rol: Rol;
    id: string | null;
    username: string | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    rol: null,
    id: null,
    username: null,
    token: null,
    login: async () => { },
    logout: () => { }
});

export default AuthContext;
