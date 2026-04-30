import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
    const { user } = useAuth();

    // Not logged in — send to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but wrong role — send to their own dashboard
    if (roles && !roles.includes(user.role)) {
        return <Navigate to={getDashboardPath(user.role)} replace />;
    }

    return children;
}

function getDashboardPath(role) {
    switch (role) {
        case 'BUYER':  return '/buyer/dashboard';
        case 'SELLER': return '/seller/dashboard';
        case 'DRIVER': return '/driver/dashboard';
        case 'ADMIN':  return '/admin/dashboard';
        default:       return '/login';
    }
}