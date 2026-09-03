import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  User,
  Users,
  ShieldCheck,
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  PieChart,
  Eye,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CommissionRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

export const Commissions: React.FC = () => {
  const {
    commissions,
    transactions,
    rentalDeals,
    users,
    updateCommissionSplitPaid,
    recordCommissionCollection,
  } = useData();
  const { currentUser, isAdmin, isTeamLeader } = useAuth();
  const { success, error, info } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [collectModalData, setCollectModalData] = useState<CommissionRecord | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [selectedRecord, setSelectedRecord] = useState<CommissionRecord | null>(null);

  // Exclude orphaned commissions (deals that no longer exist)
  const validCommissions = useMemo(() => {
    if (transactions.length === 0 && rentalDeals.length === 0) return commissions;
    const validDealIds = new Set([
      ...transactions.map((t) => t.id),
      ...rentalDeals.map((r) => r.id),
    ]);
    return commissions.filter((c) => c.dealId && validDealIds.has(c.dealId));
  }, [commissions, transactions, rentalDeals]);

  // Financial calculations
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let totalPaidToAgents = 0;
    let myEarned = 0;
    let myPaid = 0;

    validCommissions.forEach((c) => {
      totalExpected += c.totalExpectedCommission || 0;
      totalCollected += c.collectedAmount || 0;

      c.splits?.forEach((s) => {
        if (s.isPaid) {
          totalPaidToAgents += s.amount || 0;
        }
        if (s.beneficiaryId === currentUser?.id) {
          myEarned += s.amount || 0;
          if (s.isPaid) myPaid += s.amount || 0;
        }
      });
    });

    return {
      totalExpected,
      totalCollected,
      totalRemaining: totalExpected - totalCollected,
      totalPaidToAgents,
      myEarned,
      myPaid,
      myUnpaid: myEarned - myPaid,
    };
  }, [validCommissions, currentUser]);

  // Filtered Commission Records
  const filteredCommissions = useMemo(() => {
    return validCommissions.filter((c) => {
      // Role filtering: Agents only see records where they have a split
      if (currentUser?.role === 'AGENT') {
        const hasMySplit = c.splits?.some((s) => s.beneficiaryId === currentUser.id);
        if (!hasMySplit) return false;
      }

      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = c.dealCode.toLowerCase().includes(q);
        const matchProp = c.propertyTitle.toLowerCase().includes(q) || c.propertyCode.toLowerCase().includes(q);
        const matchCust = c.customerName.toLowerCase().includes(q);
        if (!matchCode && !matchProp && !matchCust) return false;
      }

      return true;
    });
  }, [commissions, currentUser, filterStatus, searchQuery]);

  // Handle Record Collection from Client
  const handleCollectSubmit = async () => {
    if (!collectModalData || collectAmount <= 0) return;
    await recordCommissionCollection(collectModalData.id, collectAmount);
    setCollectModalData(null);
    setCollectAmount(0);
  };

  // Handle Mark Split as Paid
  const handleToggleSplitPaid = async (commId: string, splitId: string, currentPaid: boolean) => {
    if (!isAdmin && !isTeamLeader) {
      error('Chỉ Quản trị viên hoặc Trưởng phòng mới có quyền xác nhận chi trả hoa hồng.');
      return;
    }
    await updateCommissionSplitPaid(commId, splitId, !currentPaid);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <DollarSign className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Quản Trị Hoa Hồng & Phân Chia Quyết Toán
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi dòng tiền hoa hồng thu về từ giao dịch BĐS và phân bổ minh bạch cho từng môi giới.
          </p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Tổng hoa hồng kỳ vọng</span>
            <PieChart className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-[#001f3f]">
            {formatCurrency(stats.totalExpected)}
          </div>
          <div className="text-[11px] text-slate-400">Từ tất cả các giao dịch bán & thuê</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Đã thu về công ty</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {formatCurrency(stats.totalCollected)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            Còn phải thu: {formatCurrency(stats.totalRemaining)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Đã chi trả môi giới</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">
            {formatCurrency(stats.totalPaidToAgents)}
          </div>
          <div className="text-[11px] text-slate-400">Quyết toán cho đầu nguồn, đầu bán, team</div>
        </div>

        <div className="bg-gradient-to-br from-[#001f3f] to-[#002f5f] p-4 rounded-2xl text-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>Hoa hồng của bạn ({currentUser?.fullName})</span>
            <Wallet className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-xl font-black text-[#D4AF37]">
            {formatCurrency(stats.myEarned)}
          </div>
          <div className="text-[11px] text-slate-300">
            Đã nhận: {formatCurrency(stats.myPaid)} • Chờ nhận: {formatCurrency(stats.myUnpaid)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã giao dịch, tên BĐS, khách hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả trạng thái thu</option>
            <option value="CHUA_THU">Chưa thu tiền</option>
            <option value="THU_MOT_PHAN">Đã thu một phần</option>
            <option value="DA_THU_DU">Đã thu đủ</option>
          </select>
        </div>
      </div>

      {/* Commission Deals List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Bảng kê phân bổ hoa hồng theo giao dịch ({filteredCommissions.length})
          </span>
        </div>

        {filteredCommissions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <DollarSign className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">Chưa có bản ghi hoa hồng nào</p>
            <p className="text-xs text-slate-400">Hoa hồng sẽ tự động khởi tạo khi có giao dịch Mua Bán hoặc Cho Thuê.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCommissions.map((comm) => {
              const statusVariant =
                comm.status === 'DA_THU_DU'
                  ? 'success'
                  : comm.status === 'THU_MOT_PHAN'
                  ? 'warning'
                  : 'danger';

              const statusText =
                comm.status === 'DA_THU_DU'
                  ? 'Đã thu đủ'
                  : comm.status === 'THU_MOT_PHAN'
                  ? 'Đã thu một phần'
                  : 'Chưa thu tiền';

              return (
                <div key={comm.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-4">
                  {/* Row Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#001f3f] bg-slate-100 px-2 py-0.5 rounded">
                          {comm.dealCode}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{comm.propertyTitle}</h3>
                        <Badge variant={statusVariant}>{statusText}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>BĐS: <strong className="font-mono text-[#001f3f]">{comm.propertyCode}</strong></span>
                        <span>Khách giao dịch: <strong>{comm.customerName}</strong></span>
                        <span>Giá trị deal: <strong>{formatCurrency(comm.dealPrice)}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-[#D4AF37]">
                        {formatCurrency(comm.totalExpectedCommission)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Đã thu: <strong className="text-emerald-700">{formatCurrency(comm.collectedAmount)}</strong> • Còn thiếu: {formatCurrency(comm.remainingCommission)}
                      </div>
                    </div>
                  </div>

                  {/* Splits Breakdown Grid */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#001f3f]" />
                        Chi tiết phân chia các đầu hoa hồng:
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {comm.splits?.map((split) => {
                        const isMySplit = split.beneficiaryId === currentUser?.id;
                        return (
                          <div
                            key={split.id}
                            className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                              isMySplit
                                ? 'bg-amber-50/70 border-amber-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                <span>{split.role === 'COMPANY' ? 'Công ty' : split.role === 'LISTING_AGENT' ? 'Đầu nguồn' : split.role === 'SELLING_AGENT' ? 'Đầu bán' : 'Trưởng phòng'} ({split.percentage}%)</span>
                                <Badge variant={split.isPaid ? 'success' : 'warning'}>
                                  {split.isPaid ? 'Đã chi' : 'Chưa chi'}
                                </Badge>
                              </div>
                              <div className="font-bold text-slate-900 truncate">
                                {split.beneficiaryName} {isMySplit && '(Bạn)'}
                              </div>
                              <div className="font-extrabold text-[#001f3f] text-sm pt-1">
                                {formatCurrency(split.amount)}
                              </div>
                            </div>

                            {/* Action to Mark Paid (Admin / Leader) */}
                            {(isAdmin || isTeamLeader) && (
                              <button
                                onClick={() => handleToggleSplitPaid(comm.id, split.id, split.isPaid)}
                                className={`mt-2 py-1 px-2 text-[11px] font-bold rounded text-center transition-colors ${
                                  split.isPaid
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                }`}
                              >
                                {split.isPaid ? 'Hủy đánh dấu chi' : 'Xác nhận đã chi trả'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-end gap-2 text-xs">
                    {(isAdmin || isTeamLeader) && comm.status !== 'DA_THU_DU' && (
                      <button
                        onClick={() => {
                          setCollectModalData(comm);
                          setCollectAmount(comm.remainingCommission);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Ghi nhận thu tiền từ khách/chủ nhà
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Record Commission Collection */}
      {collectModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Ghi Nhận Thu Phí Hoa Hồng
              </h3>
              <button
                onClick={() => setCollectModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
              <div>Giao dịch: <strong>{collectModalData.dealCode}</strong></div>
              <div>Bất động sản: <strong>{collectModalData.propertyTitle}</strong></div>
              <div>Tổng hoa hồng: <strong>{formatCurrency(collectModalData.totalExpectedCommission)}</strong></div>
              <div>Đã thu trước đó: <strong className="text-emerald-700">{formatCurrency(collectModalData.collectedAmount)}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Số tiền thu đợt này (VNĐ) *</label>
                <input
                  type="number"
                  required
                  value={collectAmount || ''}
                  onChange={(e) => setCollectAmount(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold text-emerald-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setCollectModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleCollectSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Lưu Thu Tiền Hoa Hồng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
