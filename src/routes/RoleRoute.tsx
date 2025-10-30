import { Navigate } from 'react-router-dom';
import useAuth from '../auth/useAuth';
import type { Rol } from '../auth/AuthContext';
import type { ReactElement } from 'react';

interface RoleRouteProps {
    children: ReactElement;
    allowedRoles: Rol[];
}

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
    const { isAuthenticated, rol } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" />;
    if (!allowedRoles.includes(rol)) return <Navigate to="/" />;

    return children;
};

export default RoleRoute;
