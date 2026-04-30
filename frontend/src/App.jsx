import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Register from './pages/Register';
import Login from './pages/Login';
import PaymentPage    from './pages/buyer/PaymentPage';
import PaymentSuccess from './pages/buyer/PaymentSuccess';
import PaymentCancel  from './pages/buyer/PaymentCancel';

const BuyerDashboard  = lazy(() => import('./pages/buyer/BuyerDashboard'));
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'));
const DriverDashboard = lazy(() => import('./pages/driver/DriverDashboard'));
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'));

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Suspense fallback={
                    <div style={{ padding: '48px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                        Loading...
                    </div>
                }>
                    <Routes>

                        {/* Root redirect */}
                        <Route path="/" element={<Navigate to="/login" replace />} />

                        {/* Guest only — logged in users are redirected away */}
                        <Route path="/register" element={
                            <GuestRoute><Register /></GuestRoute>
                        } />
                        <Route path="/login" element={
                            <GuestRoute><Login /></GuestRoute>
                        } />

                        {/* Buyer only */}
                        <Route path="/buyer/dashboard" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Seller only */}
                        <Route path="/seller/dashboard" element={
                            <ProtectedRoute allowedRoles={['SELLER']}>
                                <SellerDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Driver only */}
                        <Route path="/driver/dashboard" element={
                            <ProtectedRoute allowedRoles={['DRIVER']}>
                                <DriverDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Admin only */}
                        <Route path="/admin/dashboard" element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } />

                        <Route path="/payment/:auctionId" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <PaymentPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/payment/success" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <PaymentSuccess />
                            </ProtectedRoute>
                        } />
                        <Route path="/payment/cancel" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <PaymentCancel />
                            </ProtectedRoute>
                        } />

                        {/* Catch all, send unknown routes to login */}
                        <Route path="*" element={<Navigate to="/login" replace />} />

                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}