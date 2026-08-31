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
import { SAMPLE_USERS } from '../../data/sampleData';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { currentUser, isFirebaseActive, switchDemoUser, logout } = useAuth();
  const { filterState, setFilterState, resetDemoData } = useData();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);

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

      {/* Right: Firebase Indicator, Demo Switcher, User Profile */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Firebase Status pill */}
        <div
          title={isFirebaseActive ? 'Kết nối trực tiếp Cloud Firestore' : 'Chế độ lưu trữ nội bộ (Demo / Offline Ready)'}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            isFirebaseActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-[#D4AF37] border-amber-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isFirebaseActive ? 'Firebase Live' : 'Bản Thử Nghiệm'}</span>
        </div>

        {/* Switch demo account button */}
        <button
          type="button"
          onClick={() => setShowDemoSelector(!showDemoSelector)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#001f3f] text-xs font-semibold rounded-lg transition-colors border border-gray-200"
        >
          <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="hidden sm:inline">Đổi vai trò</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>

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

            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#D4AF37] shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#001f3f] text-white flex items-center justify-center font-bold text-sm border-2 border-[#D4AF37]">
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
            )}
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
                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Demo User Selector Modal */}
      {showDemoSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              Chọn tài khoản thử nghiệm
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chuyển đổi vai trò tức thời để kiểm tra cơ chế phân quyền thực tế:
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {SAMPLE_USERS.map((user) => {
                const isCurrent = currentUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      switchDemoUser(user.id);
                      setShowDemoSelector(false);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{user.fullName}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">{user.notes || user.email}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <RoleBadge role={user.role} />
                        {user.teamName && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                            • {user.teamName}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDemoSelector(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
