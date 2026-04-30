import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GuestRoute({ children }) {
    const { user } = useAuth();

    if (!user) {
        return children;
    }

    // Already logged in — send to their dashboard
    switch (user.role) {
        case 'BUYER':  return <Navigate to="/buyer/dashboard"  replace />;
        case 'SELLER': return <Navigate to="/seller/dashboard" replace />;
        case 'DRIVER': return <Navigate to="/driver/dashboard" replace />;
        case 'ADMIN':  return <Navigate to="/admin/dashboard"  replace />;
        default:       return <Navigate to="/login"            replace />;
    }
}