import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Building,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  CalendarDays,
  ListFilter,
  MessageSquare,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Appointment } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

export const Appointments: React.FC = () => {
  const {
    appointments,
    properties,
    customers,
    users,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    rescheduleAppointment,
    completeAppointment,
  } = useData();
  const { currentUser, isTeamLeader } = useAuth();
  const { success, error, info } = useToast();

  // Filters
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDateRange, setFilterDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
  const [filterAgentId, setFilterAgentId] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [rescheduleModalData, setRescheduleModalData] = useState<Appointment | null>(null);
  const [completeModalData, setCompleteModalData] = useState<Appointment | null>(null);
  const [detailModalData, setDetailModalData] = useState<Appointment | null>(null);

  // Add Appointment Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Appointment['type']>('Dẫn khách xem BĐS');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newAgentId, setNewAgentId] = useState(currentUser?.id || '');
  const [newNotes, setNewNotes] = useState('');

  // Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Complete Form State
  const [resultNotes, setResultNotes] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('Khách thích vị trí và diện tích, đang cân nhắc thêm về giá');
  const [nextAction, setNextAction] = useState('Hẹn tái đàm phán giá với chủ nhà');

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    const todayStr地下 = new Date().toISOString().split('T')[0];

    return appointments.filter((apt) => {
      // Role filtering: Agent sees their own, Leader sees team, Admin sees all
      if (currentUser?.role === 'AGENT') {
        if (apt.assignedAgentId !== currentUser.id) return false;
      } else if (currentUser?.role === 'TEAM_LEADER' && currentUser.teamId) {
        if (apt.teamId !== currentUser.teamId && apt.assignedAgentId !== currentUser.id) return false;
      }

      if (filterAgentId !== 'ALL' && apt.assignedAgentId !== filterAgentId) return false;
      if (filterStatus !== 'ALL' && apt.status !== filterStatus) return false;

      if (filterDateRange === 'TODAY') {
        if (apt.startDate !== todayStr地下) return false;
      } else if (filterDateRange === 'WEEK') {
        // approx 7 days
        const aptTime = new Date(apt.startDate).getTime();
        const now = new Date().getTime();
        const diffDays更为 = (aptTime - now) / (1000 * 3600 * 24);
        if (diffDays更为 < -1 || diffDays更为 > 7) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = apt.title.toLowerCase().includes(q);
        const matchCust = apt.customerName?.toLowerCase().includes(q);
        const matchProp = apt.propertyCode?.toLowerCase().includes(q);
        const matchAgent = apt.agentName?.toLowerCase().includes(q);
        if (!matchTitle && !matchCust && !matchProp && !matchAgent) return false;
      }

      return true;
    });
  }, [appointments, currentUser, filterAgentId, filterStatus, filterDateRange, searchQuery]);

  // Handle Add Appointment Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      error('Vui lòng nhập tiêu đề cuộc hẹn');
      return;
    }

    const prop = properties.find((p) => p.id === newPropertyId);
    const cust四周 = customers.find((c) => c.id === newCustomerId);
    const agent = users.find((u) => u.id === newAgentId);

    try {
      await addAppointment({
        title: newTitle,
        type: newType,
        startDate: newStartDate,
        startTime: newStartTime,
        startDateTime: `${newStartDate}T${newStartTime}:00+07:00`,
        status: 'Đã lên lịch',
        propertyId: prop?.id,
        propertyCode: prop?.code,
        propertyAddress: prop?.address,
        customerId: cust四周?.id,
        customerName: cust四周?.fullName || 'Khách hàng',
        customerPhone: cust四周?.phone,
        assignedAgentId: agent?.id || currentUser?.id || 'agent_1',
        agentName: agent?.fullName || currentUser?.fullName || 'Môi giới',
        notes: newNotes,
      });

      setIsAddModalOpen(false);
      setNewTitle('');
      setNewNotes('');
      success('Tạo lịch hẹn thành công');
    } catch (err: any) {
      error('Lỗi khi tạo lịch hẹn: ' + err.message);
    }
  };

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async () => {
    if (!rescheduleModalData) return;
    if (!rescheduleDate) {
      error('Vui lòng chọn ngày mới');
      return;
    }
    await rescheduleAppointment(rescheduleModalData.id, rescheduleDate, rescheduleTime, rescheduleReason);
    setRescheduleModalData(null);
    setRescheduleReason('');
  };

  // Handle Complete Submit
  const handleCompleteSubmit = async () => {
    if (!completeModalData) return;
    await completeAppointment(completeModalData.id, resultNotes, customerFeedback, nextAction);
    setCompleteModalData(null);
    setResultNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-[#001f3f]">
              Quản Lý Lịch Hẹn & Dẫn Khách
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi kế hoạch khảo sát nhà đất thực tế và ghi nhận phản hồi từ khách hàng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#001f3f] text-white hover:bg-[#002f5f] rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Tạo Lịch Hẹn Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, khách hàng, mã BĐS, môi giới..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#001f3f] focus:bg-white outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setFilterDateRange('TODAY')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterDateRange === 'TODAY' ? 'bg-white text-[#001f3f] shadow-xs' : 'text-slate-600'
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setFilterDateRange('WEEK')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterDateRange === 'WEEK' ? 'bg-white text-[#001f3f] shadow-xs' : 'text-slate-600'
                }`}
              >
                7 ngày tới
              </button>
              <button
                onClick={() => setFilterDateRange('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterDateRange === 'ALL' ? 'bg-white text-[#001f3f] shadow-xs' : 'text-slate-600'
                }`}
              >
                Tất cả
              </button>
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đã lên lịch">Đã lên lịch</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Dời lịch">Dời lịch</option>
              <option value="Hủy hẹn">Hủy hẹn</option>
            </select>

            {/* Agent filter if Team Leader or Admin */}
            {isTeamLeader && (
              <select
                value={filterAgentId}
                onChange={(e) => setFilterAgentId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none"
              >
                <option value="ALL">Tất cả môi giới</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Appointments List View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách lịch hẹn ({filteredAppointments.length})
          </span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold">Không tìm thấy lịch hẹn phù hợp</p>
            <p className="text-xs text-slate-400">Hãy thêm lịch hẹn mới hoặc thay đổi bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAppointments.map((apt) => {
              const statusVariant =
                apt.status === 'Đã hoàn thành'
                  ? 'success'
                  : apt.status === 'Đã lên lịch'
                  ? 'primary'
                  : apt.status === 'Dời lịch'
                  ? 'warning'
                  : 'danger';

              return (
                <div key={apt.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#001f3f] bg-slate-100 px-2 py-0.5 rounded">
                          {apt.code}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{apt.title}</h3>
                        <Badge variant={statusVariant}>{apt.status}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-[#001f3f]">
                          <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {apt.startTime} ngày {formatDate(apt.startDate)}
                        </span>

                        {apt.propertyCode && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            BĐS: <strong className="text-slate-800 font-mono">{apt.propertyCode}</strong>
                          </span>
                        )}

                        {apt.customerName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            Khách: <strong className="text-slate-800">{apt.customerName}</strong> ({apt.customerPhone})
                          </span>
                        )}

                        <span className="text-slate-500">
                          Phụ trách: <strong>{apt.agentName}</strong>
                        </span>
                      </div>

                      {apt.propertyAddress && (
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{apt.propertyAddress}</span>
                        </div>
                      )}

                      {/* Feedback note if completed */}
                      {apt.resultNotes && (
                        <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1 mt-2">
                          <div className="font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Kết quả buổi khảo sát: {apt.resultNotes}
                          </div>
                          {apt.customerFeedback && (
                            <div className="text-slate-700">Phản hồi khách: "{apt.customerFeedback}"</div>
                          )}
                          {apt.nextAction && (
                            <div className="text-[#001f3f] font-semibold">Hành động tiếp: {apt.nextAction}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {apt.status === 'Đã lên lịch' && (
                        <>
                          <button
                            onClick={() => {
                              setRescheduleModalData(apt);
                              setRescheduleDate(apt.startDate);
                              setRescheduleTime(apt.startTime);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Dời lịch
                          </button>

                          <button
                            onClick={() => {
                              setCompleteModalData(apt);
                              setResultNotes('');
                            }}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Hoàn thành
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setDetailModalData(apt)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add Appointment */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#D4AF37]" />
                Thêm Lịch Hẹn Khảo Sát Mới
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Tiêu đề cuộc hẹn *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Dẫn anh Tuấn xem căn nhà phố Mỹ Phước..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Loại hình hẹn</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                  >
                    <option value="Dẫn khách xem BĐS">Dẫn khách xem BĐS</option>
                    <option value="Gặp tư vấn">Gặp tư vấn</option>
                    <option value="Đặt cọc">Đặt cọc giữ chỗ</option>
                    <option value="Ký hợp đồng">Ký hợp đồng</option>
                    <option value="Khảo sát nguồn hàng">Khảo sát nguồn hàng</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Môi giới phụ trách</label>
                  <select
                    value={newAgentId}
                    onChange={(e) => setNewAgentId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Ngày hẹn *</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Giờ hẹn *</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Chọn BĐS khảo sát</label>
                  <select
                    value={newPropertyId}
                    onChange={(e) => setNewPropertyId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                  >
                    <option value="">-- Chọn bất động sản --</option>
                    {properties
                      .filter((p) => !p.isDeleted)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Chọn Khách hàng</label>
                  <select
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers
                      .filter((c) => !c.isDeleted)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.fullName} - {c.phone}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Ghi chú & lộ trình dẫn khách</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú chi tiết địa điểm tập trung, lưu ý đặc điểm nhà..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#001f3f] hover:bg-[#002f5f] rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  Lưu Lịch Hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reschedule */}
      {rescheduleModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                Dời Lịch Hẹn Khảo Sát
              </h3>
              <button
                onClick={() => setRescheduleModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              Đang dời lịch: <strong>{rescheduleModalData.title}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Ngày mới *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Giờ mới *</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-bold text-slate-700 mb-1 block">Lý do dời lịch</label>
              <textarea
                rows={2}
                placeholder="Ví dụ: Khách bận họp đột xuất, hẹn sang buổi chiều..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setRescheduleModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleRescheduleSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
              >
                Xác Nhận Dời Lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Complete Appointment & Record Feedback */}
      {completeModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Ghi Nhận Kết Quả & Phản Hồi Khách
              </h3>
              <button
                onClick={() => setCompleteModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                Cuộc hẹn: <strong>{completeModalData.title}</strong>
              </div>
              <div className="text-slate-500">
                Khách: {completeModalData.customerName} ({completeModalData.customerPhone})
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">
                  Kết quả khảo sát thực tế *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ví dụ: Đã dẫn khách xem thực tế toàn bộ căn nhà và gặp trực tiếp chủ nhà..."
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">
                  Ý kiến & Đánh giá của khách hàng
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Khách ưng hướng và pháp lý sổ hồng, yêu cầu thương lượng bớt 50 triệu..."
                  value={customerFeedback}
                  onChange={(e) => setCustomerFeedback(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Hành động tiếp theo</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hẹn thứ 6 thương lượng giá chốt cọc..."
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#001f3f]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setCompleteModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Đóng
              </button>
              <button
                onClick={handleCompleteSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Lưu Kết Quả & Hoàn Tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Appointment Detail */}
      {detailModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-[#001f3f]">Chi Tiết Lịch Hẹn</h3>
              <button
                onClick={() => setDetailModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mã lịch hẹn:</span>
                <span className="font-bold font-mono">{detailModalData.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tiêu đề:</span>
                <span className="font-bold">{detailModalData.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Thời gian:</span>
                <span className="font-semibold text-[#001f3f]">
                  {detailModalData.startTime} - {formatDate(detailModalData.startDate)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Bất động sản:</span>
                <span>{detailModalData.propertyCode} ({detailModalData.propertyAddress})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Khách hàng:</span>
                <span>{detailModalData.customerName} - {detailModalData.customerPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Môi giới phụ trách:</span>
                <span className="font-bold">{detailModalData.agentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Trạng thái:</span>
                <Badge variant="primary">{detailModalData.status}</Badge>
              </div>
              {detailModalData.notes && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Ghi chú:</span>
                  <div className="p-2.5 bg-slate-50 rounded-lg">{detailModalData.notes}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setDetailModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
