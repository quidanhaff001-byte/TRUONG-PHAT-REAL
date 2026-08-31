import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Settings as SettingsIcon,
  Database,
  Shield,
  RotateCcw,
  Building,
  Key,
  Globe,
  Bell,
  CheckCircle2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { isFirebaseActive, currentUser } = useAuth();
  const { resetDemoData } = useData();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Cài đặt hệ thống
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cấu hình thông tin doanh nghiệp, kết nối cơ sở dữ liệu Firebase và thiết lập phân quyền.
        </p>
      </div>

      <div className="space-y-4">
        {/* Database & Cloud Connection Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600" />
              Trạng thái Cơ sở dữ liệu & Lưu trữ đám mây
            </h2>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isFirebaseActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isFirebaseActive ? 'Firebase Đang hoạt động' : 'Chế độ Demo / Cục bộ'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Hệ thống BDS PRO được kiến trúc để hoạt động mượt mà cả khi chưa kết nối Firebase (với LocalStorage Cache + Dữ liệu mẫu thực tế) lẫn khi kết nối Firebase Firestore & Authentication thực tế.
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Dịch vụ xác thực:</span>
              <span className="font-semibold text-slate-800">Firebase Auth / Google Identity</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cơ sở dữ liệu Realtime:</span>
              <span className="font-semibold text-slate-800">Cloud Firestore (Multi-tenant RBAC)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lưu trữ hình ảnh:</span>
              <span className="font-semibold text-slate-800">Firebase Cloud Storage + Nén Client</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={resetDemoData}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Nạp lại bộ dữ liệu mẫu chuẩn</span>
            </button>
          </div>
        </div>

        {/* Company Profile Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-amber-600" />
            Thông tin đơn vị môi giới
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên sàn / Đơn vị phân phối</label>
              <input
                type="text"
                defaultValue="TRUONG PHAT REAL - Hệ thống Bất Động Sản Chuyên Nghiệp"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hotline Kỹ thuật & Hỗ trợ</label>
              <input
                type="text"
                defaultValue="0919 414 884 (Kỹ thuật)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-[#001f3f]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở</label>
              <input
                type="text"
                defaultValue="Số 68 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Múi giờ & Định dạng tiền tệ</label>
              <input
                type="text"
                disabled
                defaultValue="Asia/Ho_Chi_Minh (GMT+7) | VNĐ"
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
