import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Login } from '../../pages/Auth/Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Requirement 5: ProtectedRoute phải kiểm tra Firebase onAuthStateChanged.
 * Requirement 6: Không cho truy cập Dashboard chỉ dựa vào dữ liệu local.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070e1c] text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">Đang kiểm tra xác thực Firebase...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return <>{children}</>;
};
