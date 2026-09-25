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
import BuyerHome from './pages/buyer/BuyerHome';
import BuyerBrowse from './pages/buyer/BuyerBrowse';
import BuyerBids from './pages/buyer/BuyerBids';
import BuyerOrders from './pages/buyer/BuyerOrders';

// const BuyerDashboard = lazy(() => import('./pages/buyer/BuyerDashboard'));
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
                                <BuyerHome />
                            </ProtectedRoute>
                        } />

                        <Route path="/buyer/browse" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerBrowse />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/bids" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerBids />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/watchlist" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerHome />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/orders" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerOrders />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/messages" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerHome />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/profile" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerHome />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/settings" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerHome />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/payments" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerHome />
                            </ProtectedRoute>
                        } />
                        <Route path="/buyer/searches" element={
                            <ProtectedRoute allowedRoles={['BUYER']}>
                                <BuyerHome />
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