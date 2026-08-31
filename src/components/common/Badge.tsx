import React from 'react';
import { TransactionType, PropertyStatus, UserRole } from '../../types';

export const TransactionBadge: React.FC<{ type: TransactionType }> = ({ type }) => {
  switch (type) {
    case 'SALE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Ký gửi bán
        </span>
      );
    case 'RENT':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          Cho thuê
        </span>
      );
    case 'TRANSFER':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Sang nhượng
        </span>
      );
    case 'SALE_AND_RENT':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
          Bán & Cho thuê
        </span>
      );
    default:
      return null;
  }
};

export const StatusBadge: React.FC<{ status: PropertyStatus }> = ({ status }) => {
  let style = 'bg-slate-100 text-slate-800 border-slate-200';

  if (status.includes('Đang bán') || status.includes('Đang cho thuê') || status.includes('Đang sang nhượng')) {
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (status.includes('Mới tiếp nhận') || status.includes('Chờ xác minh')) {
    style = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (status.includes('thương lượng') || status.includes('Có khách')) {
    style = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (status.includes('đặt cọc') || status.includes('giữ chỗ')) {
    style = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (status.includes('Đã hoàn tất') || status.includes('Đã công chứng') || status.includes('Đã bàn giao') || status.includes('Đã cho thuê')) {
    style = 'bg-teal-50 text-teal-700 border-teal-200';
  } else if (status.includes('Tạm ngưng') || status.includes('Hết hạn') || status.includes('ngưng')) {
    style = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {status}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
          Quản trị viên
        </span>
      );
    case 'TEAM_LEADER':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Trưởng nhóm
        </span>
      );
    case 'AGENT':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Môi giới
        </span>
      );
    default:
      return null;
  }
};

export const Badge: React.FC<{
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  children: React.ReactNode;
  className?: string;
}> = ({ variant = 'neutral', children, className = '' }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (variant === 'primary') {
    style = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (variant === 'success') {
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (variant === 'warning') {
    style = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (variant === 'danger') {
    style = 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {children}
    </span>
  );
};

