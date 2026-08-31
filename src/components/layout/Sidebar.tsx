import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building,
  Users2,
  Sparkles,
  CalendarDays,
  BadgePercent,
  KeyRound,
  FileText,
  DollarSign,
  UserCog,
  BarChart3,
  History,
  Trash2,
  Settings,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import { Avatar } from '../common/Avatar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, isAdmin, isTeamLeader } = useAuth();

  // Define menu items with permission requirements
  const allMenuItems = [
    { label: 'Tổng quan', path: '/', icon: LayoutDashboard, visible: true },
    { label: 'Nguồn hàng', path: '/properties', icon: Building, visible: true },
    { label: 'Khách hàng', path: '/customers', icon: Users2, visible: true },
    { label: 'Ghép sản phẩm', path: '/match', icon: Sparkles, visible: true },
    { label: 'Lịch hẹn', path: '/appointments', icon: CalendarDays, visible: true },
    { label: 'Bán & Sang nhượng', path: '/sales', icon: BadgePercent, visible: true },
    { label: 'Cho thuê', path: '/rentals', icon: KeyRound, visible: true },
    { label: 'Hợp đồng thuê', path: '/contracts', icon: FileText, visible: isTeamLeader },
    { label: 'Hoa hồng', path: '/commissions', icon: DollarSign, visible: isTeamLeader },
    { label: 'Nhân sự & Nhóm', path: '/users', icon: UserCog, visible: isTeamLeader },
    { label: 'Báo cáo', path: '/reports', icon: BarChart3, visible: isTeamLeader },
    { label: 'Nhật ký hoạt động', path: '/audit-logs', icon: History, visible: isAdmin },
    { label: 'Thùng rác', path: '/trash', icon: Trash2, visible: isAdmin },
    { label: 'Cài đặt hệ thống', path: '/settings', icon: Settings, visible: isAdmin },
  ];

  const menuItems = allMenuItems.filter((item) => item.visible);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 lg:w-72 bg-[#001f3f] text-slate-100 flex flex-col border-r border-white/10 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#001f3f]">
          <Logo variant="sidebar" />

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current user mini card */}
        <div className="px-5 py-3.5 bg-black/20 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar
              src={currentUser?.avatarUrl}
              name={currentUser?.fullName}
              size="md"
              status={currentUser?.status}
              showStatusDot={true}
              theme="gold"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{currentUser?.fullName}</div>
              <div className="text-[11px] text-[#D4AF37] font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {currentUser?.role === 'ADMIN'
                  ? 'Quản trị viên'
                  : currentUser?.role === 'TEAM_LEADER'
                  ? 'Trưởng nhóm'
                  : 'Môi giới'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-3 space-y-0.5 custom-scrollbar">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 mb-2">
            Danh mục chính
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-6 py-3 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#D4AF37]/10 border-r-4 border-[#D4AF37] text-[#D4AF37] font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Support Card in Sidebar */}
        <div className="p-4 m-4 bg-white/5 rounded-2xl border border-white/10 shrink-0">
          <div className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider mb-1">
            KỸ THUẬT HỆ THỐNG
          </div>
          <a
            href="tel:0919414884"
            className="text-sm text-white font-mono font-bold hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"
          >
            <span>0919 414 884</span>
          </a>
          <div className="text-[10px] text-gray-400 mt-1">Hỗ trợ vận hành & dữ liệu 24/7</div>
        </div>
      </aside>
    </>
  );
};
