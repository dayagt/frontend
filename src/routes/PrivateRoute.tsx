import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import useAuth from '../auth/useAuth';

interface PrivateRouteProps {
    children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
