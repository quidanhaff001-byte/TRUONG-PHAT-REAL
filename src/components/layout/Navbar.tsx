import React, { useState } from 'react';
import { useAuth, getRoleName } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Search,
  Menu,
  RotateCcw,
  Database,
  CheckCircle2,
  ChevronDown,
  LogOut,
  UserCheck,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { RoleBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { currentUser, isFirebaseActive, logout } = useAuth();
  const { filterState, setFilterState, resetDemoData } = useData();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-20 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
      {/* Left: Mobile Toggle & Quick Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-gray-500 hover:text-[#001f3f] rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search input styled exactly per theme */}
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm nhanh mã căn, số điện thoại, địa chỉ..."
            value={filterState.searchQuery}
            onChange={(e) => setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 placeholder:text-gray-400 transition-all"
          />
          {filterState.searchQuery && (
            <button
              onClick={() => setFilterState((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-semibold"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Right: Firebase Indicator, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Firebase Live Status pill */}
        <div
          title={isFirebaseActive ? 'Kết nối trực tiếp Cloud Firestore & Auth Custom Claims' : 'Chế độ lưu trữ nội bộ'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-xs ${
            isFirebaseActive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-[#001f3f] border-amber-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Firebase Live</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">RBAC</span>
        </div>

        {/* User profile dropdown trigger */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-3 pl-4 sm:pl-6 border-l border-gray-200 text-left hover:opacity-90 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-[#001f3f] leading-none">{currentUser?.fullName}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">
                {getRoleName(currentUser?.role)}
              </div>
            </div>

            <Avatar
              src={currentUser?.avatarUrl}
              name={currentUser?.fullName}
              size="md"
              status={currentUser?.status}
              theme="navy"
            />
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 z-50 text-xs"
              onClick={() => setShowUserDropdown(false)}
            >
              <div className="p-3 bg-gray-50 rounded-xl mb-2">
                <div className="font-bold text-[#001f3f]">{currentUser?.fullName}</div>
                <div className="text-gray-500 text-[11px] truncate mt-0.5">{currentUser?.email}</div>
                <div className="mt-2 flex items-center gap-2">
                  <RoleBadge role={currentUser?.role || 'AGENT'} />
                  {currentUser?.teamName && (
                    <span className="text-[10px] text-gray-600 bg-gray-200 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                      {currentUser.teamName}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={resetDemoData}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <RotateCcw className="w-4 h-4 text-[#D4AF37]" />
                <span>Khôi phục dữ liệu mẫu gốc</span>
              </button>

              <div className="h-px bg-gray-100 my-1" />

              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
