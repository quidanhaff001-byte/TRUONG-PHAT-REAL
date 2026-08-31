import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users,
  Building,
  DollarSign,
  Calendar,
  Download,
  Printer,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const Reports: React.FC = () => {
  const {
    properties,
    customers,
    transactions,
    rentalDeals,
    rentalContracts,
    commissions,
    users,
  } = useData();
  const { currentUser } = useAuth();

  const [timeRange, setTimeRange] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('YEAR');

  // Compute Overall Key Metrics
  const summary = useMemo(() => {
    const totalProperties = properties.filter((p) => !p.isDeleted).length;
    const totalCustomers = customers.filter((c) => !c.isDeleted).length;
    const totalSalesDeals = transactions.length;
    const totalRentDeals = rentalDeals.length;
    const activeContracts = rentalContracts.filter((c) => c.status === 'Đang hiệu lực').length;

    let totalGrossRevenue = 0;
    let totalCommissionEarned = 0;

    transactions.forEach((t) => {
      totalGrossRevenue += t.dealPrice || 0;
    });

    commissions.forEach((c) => {
      totalCommissionEarned += c.collectedAmount || 0;
    });

    return {
      totalProperties,
      totalCustomers,
      totalSalesDeals,
      totalRentDeals,
      activeContracts,
      totalGrossRevenue,
      totalCommissionEarned,
    };
  }, [properties, customers, transactions, rentalDeals, rentalContracts, commissions]);

  // Agent Performance Leaderboard
  const agentLeaderboard = useMemo(() => {
    const map = new Map<string, { user: any; dealsCount: number; commission: number; listings: number }>();

    users.forEach((u) => {
      map.set(u.id, { user: u, dealsCount: 0, commission: 0, listings: 0 });
    });

    properties.forEach((p) => {
      if (p.assignedAgentId && map.has(p.assignedAgentId)) {
        map.get(p.assignedAgentId)!.listings += 1;
      }
    });

    transactions.forEach((t) => {
      if (t.sellingAgentId && map.has(t.sellingAgentId)) {
        map.get(t.sellingAgentId)!.dealsCount += 1;
      }
    });

    rentalDeals.forEach((r) => {
      if (r.sellingAgentId && map.has(r.sellingAgentId)) {
        map.get(r.sellingAgentId)!.dealsCount += 1;
      }
    });

    commissions.forEach((c) => {
      c.splits?.forEach((s) => {
        if (s.beneficiaryId && map.has(s.beneficiaryId)) {
          map.get(s.beneficiaryId)!.commission += s.amount || 0;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.commission - a.commission);
  }, [users, properties, transactions, rentalDeals, commissions]);

  // Property Distribution by District / Province
  const propertyDistrictStats = useMemo(() => {
    const distMap: Record<string, number> = {};
    properties.filter((p) => !p.isDeleted).forEach((p) => {
      const d = p.district || 'Khác';
      distMap[d] = (distMap[d] || 0) + 1;
    });
    return Object.entries(distMap).map(([name, count]) => ({ name, count }));
  }, [properties]);

  // Property Type Distribution
  const propertyTypeStats = useMemo(() => {
    const typeMap: Record<string, number> = {};
    properties.filter((p) => !p.isDeleted).forEach((p) => {
      const t = p.propertyType || 'Khác';
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    return Object.entries(typeMap).map(([name, count]) => ({ name, count }));
  }, [properties]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Báo Cáo & Phân Tích Hiệu Suất Kinh Doanh
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tổng quan doanh số, nguồn hàng ký gửi, bảng xếp hạng môi giới và tỷ lệ chốt deal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-[#001f3f] text-white hover:bg-[#002f5f] rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Xuất & In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>TỔNG DOANH SỐ GIAO DỊCH</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#001f3f]">
            {formatCurrency(summary.totalGrossRevenue)}
          </div>
          <div className="text-xs text-slate-500">
            Từ {summary.totalSalesDeals} deal mua bán & sang nhượng
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>HOA HỒNG THỰC THU</span>
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(summary.totalCommissionEarned)}
          </div>
          <div className="text-xs text-emerald-600 font-medium">
            Đã nhập quỹ công ty & chi trả theo tỷ lệ
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>KHO HÀNG BĐS ĐANG QUẢN LÝ</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-[#001f3f]">
            {summary.totalProperties} <span className="text-sm font-semibold text-slate-500">căn</span>
          </div>
          <div className="text-xs text-slate-500">
            {summary.activeContracts} hợp đồng thuê đang vận hành
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>TẬP KHÁCH HÀNG TIỀM NĂNG</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-[#001f3f]">
            {summary.totalCustomers} <span className="text-sm font-semibold text-slate-500">khách</span>
          </div>
          <div className="text-xs text-slate-500">
            Được phân loại theo nhu cầu mua & thuê
          </div>
        </div>
      </div>

      {/* Grid: Agent Performance Leaderboard & Property Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="font-bold text-sm text-[#001f3f]">
                Bảng Xếp Hạng Hiệu Suất Môi Giới (Top Performers)
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">Theo doanh thu hoa hồng</span>
          </div>

          <div className="p-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Xếp hạng</th>
                  <th className="py-3 px-4">Nhân viên / Môi giới</th>
                  <th className="py-3 px-4 text-center">Nguồn hàng ký gửi</th>
                  <th className="py-3 px-4 text-center">Deal chốt</th>
                  <th className="py-3 px-4 text-right">Tổng hoa hồng tạo ra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {agentLeaderboard.map((item, idx) => (
                  <tr key={item.user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center font-bold text-xs">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-600/70 text-white flex items-center justify-center font-bold text-xs">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400 pl-2">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.user.fullName}</div>
                      <div className="text-[11px] text-slate-400">{item.user.email} • {item.user.role}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {item.listings} BĐS
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {item.dealsCount} giao dịch
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-[#001f3f] text-sm">
                      {formatCurrency(item.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Property Type Distribution (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-sm text-[#001f3f]">Phân Bổ Loại Hình BĐS</h2>
          </div>

          <div className="space-y-3 text-xs">
            {propertyTypeStats.map((t) => {
              const percentage = summary.totalProperties > 0
                ? Math.round((t.count / summary.totalProperties) * 100)
                : 0;

              return (
                <div key={t.name} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">{t.name}</span>
                    <span className="text-[#001f3f] font-bold">{t.count} căn ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#001f3f] h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="font-bold text-xs text-slate-800 mb-2">Phân bổ theo khu vực:</div>
            <div className="flex flex-wrap gap-1.5">
              {propertyDistrictStats.map((d) => (
                <span
                  key={d.name}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  {d.name}: <strong>{d.count}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
