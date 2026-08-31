import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  TrendingUp,
  KeyRound,
  BadgePercent,
  Users,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { formatVND, formatArea, formatRelativeDate } from '../utils/formatters';
import { StatusBadge, TransactionBadge } from '../components/common/Badge';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { properties, users, teams } = useData();
  const { currentUser, isAdmin, isTeamLeader } = useAuth();

  const activeProperties = properties.filter((p) => !p.isDeleted);
  const totalCount = activeProperties.length;

  const saleCount = activeProperties.filter((p) => p.transactionType === 'SALE' || p.transactionType === 'SALE_AND_RENT').length;
  const rentCount = activeProperties.filter((p) => p.transactionType === 'RENT' || p.transactionType === 'SALE_AND_RENT').length;
  const transferCount = activeProperties.filter((p) => p.transactionType === 'TRANSFER').length;
  const depositCount = activeProperties.filter((p) => p.status.includes('nhận cọc') || p.status.includes('giữ chỗ')).length;

  // Chart Data: Transaction Breakdown
  const transactionChartData = [
    { name: 'Ký gửi Bán', value: saleCount, color: '#10B981' },
    { name: 'Cho thuê', value: rentCount, color: '#3B82F6' },
    { name: 'Sang nhượng', value: transferCount, color: '#F59E0B' },
  ];

  // Chart Data: District Breakdown
  const districtMap: Record<string, number> = {};
  activeProperties.forEach((p) => {
    const dist = p.district || 'Khác';
    districtMap[dist] = (districtMap[dist] || 0) + 1;
  });

  const districtChartData = Object.entries(districtMap)
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Recent 5 properties
  const recentProperties = [...activeProperties]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Header matching theme */}
      <div className="bg-[#001f3f] rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        {/* Background decorative gold glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                VinaReal Pro Enterprise
              </span>
              <span className="text-xs text-gray-300">
                • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Xin chào, {currentUser?.fullName}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Hệ thống hiện đang quản lý <strong className="text-[#D4AF37] font-bold">{totalCount} nguồn hàng</strong> sẵn sàng phân phối và chốt giao dịch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/properties/new')}
              className="flex items-center gap-2 px-5 py-3 bg-[#D4AF37] hover:bg-[#c49f2c] text-[#001f3f] font-bold text-xs rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-98 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tiếp nhận nguồn hàng mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Summary KPI Cards matching Design HTML */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Nguồn hàng mới */}
        <div
          onClick={() => navigate('/properties')}
          className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-[#D4AF37]/60 transition-all cursor-pointer group"
        >
          <div className="text-gray-500 text-sm font-medium mb-1">Nguồn hàng mới</div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-[#001f3f]">{totalCount}</div>
            <div className="text-green-600 text-sm font-semibold flex items-center">
              +12.5%
              <TrendingUp className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Card 2: Ký gửi Cho thuê */}
        <div
          onClick={() => navigate('/properties')}
          className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-[#D4AF37]/60 transition-all cursor-pointer group"
        >
          <div className="text-gray-500 text-sm font-medium mb-1">Nguồn hàng Cho thuê</div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-[#001f3f]">{rentCount}</div>
            <div className="text-green-600 text-sm font-semibold flex items-center">
              +5.2%
              <TrendingUp className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Card 3: Giao dịch chốt */}
        <div
          onClick={() => navigate('/properties')}
          className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-[#D4AF37]/60 transition-all cursor-pointer group"
        >
          <div className="text-gray-500 text-sm font-medium mb-1">Ký gửi Bán & Sang nhượng</div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-[#001f3f]">{saleCount + transferCount}</div>
            <div className="text-[#001f3f]/60 text-xs font-semibold uppercase tracking-wider">
              {saleCount} Bán / {transferCount} Sang
            </div>
          </div>
        </div>

        {/* Card 4: Highlight Gold Card per Professional Polish design */}
        {isTeamLeader ? (
          <div className="bg-[#D4AF37] p-6 rounded-2xl border border-amber-400 shadow-lg flex flex-col justify-between">
            <div>
              <div className="text-[#001f3f]/70 text-sm font-bold mb-1">Hoa hồng thực nhận</div>
              <div className="text-3xl font-bold text-[#001f3f]">1.25B VNĐ</div>
            </div>
            <div className="text-[#001f3f]/70 text-xs font-bold mt-2 uppercase">
              Kỳ quyết toán: Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/properties')}
            className="bg-[#D4AF37] p-6 rounded-2xl border border-amber-400 shadow-lg flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="text-[#001f3f]/70 text-sm font-bold mb-1">Nguồn hàng của bạn</div>
              <div className="text-3xl font-bold text-[#001f3f]">
                {activeProperties.filter((p) => p.assignedAgentId === currentUser?.id || p.createdBy === currentUser?.id).length}
              </div>
            </div>
            <div className="text-[#001f3f]/70 text-xs font-bold mt-2 uppercase">
              Đang phụ trách & tiếp cận khách
            </div>
          </div>
        )}
      </div>

      {/* Visual Charts Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Structure by Transaction Type */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#001f3f]">Cơ cấu nguồn hàng theo giao dịch</h3>
              <p className="text-xs text-gray-500 mt-0.5">Phân bổ tỷ trọng Bán, Cho thuê và Sang nhượng</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={transactionChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {transactionChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#10B981' : index === 1 ? '#001f3f' : '#D4AF37'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} sản phẩm`, 'Số lượng']}
                  contentStyle={{ backgroundColor: '#001f3f', borderRadius: '12px', color: '#fff', fontSize: '12px', border: '1px solid rgba(212,175,55,0.3)' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-gray-700 font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: District Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#001f3f]">Phân bổ theo Quận / Huyện</h3>
              <p className="text-xs text-gray-500 mt-0.5">Các khu vực tập trung nhiều nguồn hàng nhất</p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="district" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: any) => [`${value} bất động sản`, 'Số lượng']}
                  contentStyle={{ backgroundColor: '#001f3f', borderRadius: '12px', color: '#fff', fontSize: '12px', border: '1px solid rgba(212,175,55,0.3)' }}
                />
                <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#001f3f]">Nguồn hàng nổi bật mới tiếp nhận</h2>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/properties')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 text-gray-700"
          >
            Xem tất cả
          </button>
          <button
            onClick={() => navigate('/properties/new')}
            className="px-4 py-2 bg-[#001f3f] text-white rounded-lg text-sm font-semibold hover:bg-[#002e5c] shadow-lg flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
            Thêm nguồn hàng
          </button>
        </div>
      </div>

      {/* 3 Columns Grid for Featured Properties matching design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentProperties.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/properties/${p.id}`)}
            className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col hover:shadow-md hover:border-[#D4AF37]/60 transition-all cursor-pointer group"
          >
            <div className="relative h-48 bg-gray-200">
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-green-600 text-white text-[10px] font-bold rounded uppercase z-10">
                {p.transactionType === 'SALE' ? 'Đang bán' : p.transactionType === 'RENT' ? 'Cho thuê' : 'Sang nhượng'}
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 bg-[#001f3f]/90 text-[#D4AF37] text-[10px] font-mono font-bold rounded uppercase z-10 border border-[#D4AF37]/30">
                {p.code}
              </div>
              {p.coverImage ? (
                <img
                  src={p.coverImage}
                  alt={p.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-[#001f3f]/5 flex items-center justify-center text-gray-400">
                  <Building2 className="w-12 h-12 opacity-40" />
                </div>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-[#001f3f] leading-tight mb-2 group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                  {p.title}
                </h3>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{p.address}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-600 mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    <span>{formatArea(p.landArea)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    <span>{p.bedrooms ? `${p.bedrooms} PN, ${p.bathrooms || 0} WC` : p.propertyType}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-2xl font-black text-[#D4AF37]">
                  {p.salePrice
                    ? formatVND(p.salePrice)
                    : p.rentPriceMonthly
                    ? `${formatVND(p.rentPriceMonthly)}/tháng`
                    : p.transferPrice
                    ? `Sang ${formatVND(p.transferPrice)}`
                    : 'Thỏa thuận'}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/properties/${p.id}`);
                  }}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#001f3f] hover:bg-[#D4AF37]/20 transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
