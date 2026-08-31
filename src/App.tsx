import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { PropertyList } from './pages/Properties/PropertyList';
import { PropertyForm } from './pages/Properties/PropertyForm';
import { PropertyDetail } from './pages/Properties/PropertyDetail';
import { CustomerList } from './pages/customers/CustomerList';
import { UserList } from './pages/Users/UserList';
import { TrashList } from './pages/Trash/TrashList';
import { Settings } from './pages/Settings';
import { PropertyMatching } from './pages/Matching/PropertyMatching';
import { Appointments } from './pages/Appointments/Appointments';
import { SalesTransactions } from './pages/Sales/SalesTransactions';
import { Rentals } from './pages/Rentals/Rentals';
import { RentalContracts } from './pages/Contracts/RentalContracts';
import { Commissions } from './pages/Commissions/Commissions';
import { Reports } from './pages/Reports/Reports';
import { AuditLogs } from './pages/Logs/AuditLogs';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/properties" element={<PropertyList />} />
                  <Route path="/properties/new" element={<PropertyForm />} />
                  <Route path="/properties/:id" element={<PropertyDetail />} />
                  <Route path="/properties/:id/edit" element={<PropertyForm />} />
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/users" element={<UserList />} />
                  <Route path="/trash" element={<TrashList />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* Fully Functional Operational Modules */}
                  <Route path="/match" element={<PropertyMatching />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/sales" element={<SalesTransactions />} />
                  <Route path="/rentals" element={<Rentals />} />
                  <Route path="/contracts" element={<RentalContracts />} />
                  <Route path="/commissions" element={<Commissions />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
