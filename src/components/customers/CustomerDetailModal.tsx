import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, CustomerInteraction, Property } from '../../types';
import { formatVND, formatDateVN } from '../../utils/formatters';
import { CustomerDemandBadge, CustomerPotentialBadge, CustomerStatusBadge } from './CustomerBadges';
import { AddInteractionModal } from './AddInteractionModal';
import { ReassignCustomerModal } from './ReassignCustomerModal';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Building,
  DollarSign,
  Calendar,
  Clock,
  MessageSquare,
  PhoneCall,
  Users,
  Eye,
  Send,
  FileEdit,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Share2,
  Trash2,
  Edit,
  Sparkles,
} from 'lucide-react';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEdit,
  onDelete,
}) => {
  const { properties, appointments, addAppointment } = useData();
  const { currentUser, isAdmin, isTeamLeader } = useAuth();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INTERACTIONS' | 'APPOINTMENTS' | 'MATCHING'>('OVERVIEW');
  const [isAddInteractionOpen, setIsAddInteractionOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  // Smart Matching properties calculation
  const matchedProperties = useMemo(() => {
    return properties.filter((p) => {
      if (p.isDeleted || p.status === 'Đã bán' || p.status === 'Đã cho thuê') return false;

      // Match transaction type
      if (customer.demandType === 'MUA') {
        if (p.transactionType !== 'SALE' && p.transactionType !== 'SALE_AND_RENT') return false;
      } else if (customer.demandType === 'THUE') {
        if (p.transactionType !== 'RENT' && p.transactionType !== 'SALE_AND_RENT') return false;
      } else if (customer.demandType === 'SANG_NHUONG') {
        if (p.transactionType !== 'TRANSFER') return false;
      }

      // Match property types if specified
      if (customer.propertyTypes && customer.propertyTypes.length > 0) {
        if (!customer.propertyTypes.includes(p.propertyType as any)) return false;
      }

      // Match price range if specified
      const price = p.salePrice || p.rentPriceMonthly || p.transferPrice || 0;
      if (customer.minPrice && customer.minPrice > 0 && price < customer.minPrice * 0.8) return false;
      if (customer.maxPrice && customer.maxPrice > 0 && price > customer.maxPrice * 1.2) return false;

      // Match area if specified
      if (customer.minArea && p.landArea < customer.minArea * 0.8) return false;
      if (customer.maxArea && p.landArea > customer.maxArea * 1.2) return false;

      // Match district if customer has preferred areas
      if (customer.areas && customer.areas.length > 0 && !customer.areas.includes('Toàn thành phố')) {
        const matchDistrict = customer.areas.some(
          (area) =>
            p.district?.toLowerCase().includes(area.toLowerCase()) ||
            p.city?.toLowerCase().includes(area.toLowerCase()) ||
            p.address?.toLowerCase().includes(area.toLowerCase())
        );
        if (!matchDistrict) return false;
      }

      return true;
    });
  }, [properties, customer]);

  // Appointments for this customer
  const customerAppointments = useMemo(() => {
    return appointments.filter((a) => a.customerId === customer.id);
  }, [appointments, customer.id]);

  if (!isOpen) return null;

  const interactionLogs = customer.interactionLogs || [];

  const getInteractionIcon = (type: CustomerInteraction['type']) => {
    switch (type) {
      case 'CALL':
        return <PhoneCall className="w-4 h-4 text-emerald-600" />;
      case 'ZALO':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'MEETING':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'VIEWING':
        return <Eye className="w-4 h-4 text-amber-600" />;
      case 'SEND_PROPERTY':
        return <Send className="w-4 h-4 text-indigo-600" />;
      default:
        return <FileEdit className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
              {customer.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight text-white">{customer.fullName}</h1>
                <span className="font-mono text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                  {customer.code}
                </span>
                <CustomerDemandBadge demandType={customer.demandType} />
                <CustomerPotentialBadge level={customer.potentialLevel} />
                <CustomerStatusBadge status={customer.status} />
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-medium text-slate-200">{customer.phone}</span>
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.email}</span>
                  </span>
                )}
                <span>Môi giới phụ trách: <strong className="text-white">{customer.assignedAgentName || 'Chưa có'}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Header CTA */}
          <div className="flex items-center gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              Gọi ngay
            </a>
            {customer.zalo && (
              <a
                href={`https://zalo.me/${customer.zalo.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Zalo
              </a>
            )}
            <button
              type="button"
              onClick={() => onEdit(customer)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Chỉnh sửa"
            >
              <Edit className="w-4 h-4" />
            </button>
            {(isAdmin || isTeamLeader) && (
              <button
                type="button"
                onClick={() => setIsReassignOpen(true)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Chuyển người phụ trách"
              >
                <Users className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(customer.id)}
              className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition-colors"
              title="Xóa vào thùng rác"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
          {[
            { id: 'OVERVIEW', label: 'Thông tin & Tiêu chí nhu cầu', icon: User },
            {
              id: 'INTERACTIONS',
              label: `Lịch sử chăm sóc (${interactionLogs.length})`,
              icon: Clock,
            },
            {
              id: 'APPOINTMENTS',
              label: `Lịch hẹn & Dẫn khách (${customerAppointments.length})`,
              icon: Calendar,
            },
            {
              id: 'MATCHING',
              label: `Nguồn hàng phù hợp (${matchedProperties.length})`,
              icon: Sparkles,
              badge: matchedProperties.length > 0 ? `${matchedProperties.length}` : undefined,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  isActive
                    ? 'border-slate-900 text-slate-900 bg-white shadow-xs rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Tab Content */}
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Reminder Banner if Next appointment exists */}
              {customer.nextAppointmentDate && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                        Lịch hẹn chăm sóc tiếp theo: {formatDateVN(customer.nextAppointmentDate)}
                      </div>
                      <div className="text-xs text-amber-800 font-medium">
                        {customer.nextAppointmentNote || 'Chưa ghi chú nội dung chi tiết'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddInteractionOpen(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                  >
                    Ghi kết quả chăm sóc
                  </button>
                </div>
              )}

              {/* Requirement Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Financial requirement */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Ngân sách dự kiến
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-extrabold text-slate-900">
                      {customer.minPrice || customer.maxPrice ? (
                        <>
                          {customer.minPrice ? formatVND(customer.minPrice) : 'Từ 0'}
                          {' — '}
                          {customer.maxPrice ? formatVND(customer.maxPrice) : 'Không giới hạn'}
                        </>
                      ) : (
                        <span className="text-slate-400 font-normal text-sm">Chưa xác định ngân sách</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Hình thức: <strong className="text-slate-700">{customer.demandType === 'MUA' ? 'Mua đứt đoạn' : customer.demandType === 'THUE' ? 'Thuê dài hạn' : 'Nhận sang nhượng'}</strong>
                    </div>
                  </div>
                </div>

                {/* Property Types & Area Requirement */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Building className="w-4 h-4 text-indigo-600" />
                    Loại hình & Diện tích
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {customer.propertyTypes && customer.propertyTypes.length > 0 ? (
                        customer.propertyTypes.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">Mọi loại hình</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      Diện tích:{' '}
                      <strong>
                        {customer.minArea || customer.maxArea ? (
                          <>
                            {customer.minArea || '0'} - {customer.maxArea || '∞'} m²
                          </>
                        ) : (
                          'Tùy biến'
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Target Locations */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    Khu vực tìm kiếm
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.areas && customer.areas.length > 0 ? (
                      customer.areas.map((a) => (
                        <span
                          key={a}
                          className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-medium border border-slate-200"
                        >
                          {a}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs">Toàn thành phố</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & Demographics Details */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Chi tiết thông tin liên hệ & Hồ sơ khách
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Số điện thoại chính:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{customer.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Số Zalo / Liên hệ phụ:</span>
                    <span className="font-mono text-slate-800">{customer.zalo || customer.secondaryPhone || '---'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Email:</span>
                    <span className="text-slate-800">{customer.email || '---'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Địa chỉ hiện tại:</span>
                    <span className="text-slate-800">{customer.address || '---'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Nguồn khách hàng:</span>
                    <span className="font-medium text-slate-900">{customer.source || 'Vãng lai'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Ngày tạo hồ sơ:</span>
                    <span className="text-slate-800">{formatDateVN(customer.createdAt)}</span>
                  </div>
                </div>

                {customer.notes && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block mb-1">Ghi chú đặc biệt về khách:</span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Assignment Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
                    {customer.assignedAgentName?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Môi giới đang trực tiếp chăm sóc:</div>
                    <div className="text-sm font-bold text-slate-900">{customer.assignedAgentName || 'Chưa phân công'}</div>
                    <div className="text-xs text-slate-500">{customer.teamName || 'Chưa vào nhóm'}</div>
                  </div>
                </div>

                {(isAdmin || isTeamLeader) && (
                  <button
                    type="button"
                    onClick={() => setIsReassignOpen(true)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Chuyển người phụ trách
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIONS */}
          {activeTab === 'INTERACTIONS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Nhật ký chăm sóc khách hàng</h3>
                  <p className="text-xs text-slate-500">Toàn bộ cuộc gọi, tin nhắn Zalo, buổi gặp và phản hồi của khách</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddInteractionOpen(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ghi nhật ký mới
                </button>
              </div>

              {interactionLogs.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">Chưa có nhật ký chăm sóc nào</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Hãy lưu lại nội dung các cuộc gọi hoặc tin nhắn với khách hàng để theo dõi tiến độ chăm sóc.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddInteractionOpen(true)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm nhật ký đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {interactionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-100">
                            {getInteractionIcon(log.type)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900">{log.title}</span>
                            <span className="text-[11px] text-slate-500 ml-2 font-medium">
                              — {log.agentName}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateVN(log.date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {log.content}
                      </p>
                      {log.nextActionDate && (
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-lg">
                          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            <strong>Lịch hẹn tiếp theo:</strong> {formatDateVN(log.nextActionDate)}{' '}
                            {log.nextActionNote ? `(${log.nextActionNote})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPOINTMENTS */}
          {activeTab === 'APPOINTMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lịch hẹn dẫn xem nhà & gặp gỡ</h3>
                  <p className="text-xs text-slate-500">Các lịch hẹn xem bất động sản đã lên lịch</p>
                </div>
              </div>

              {customerAppointments.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">Chưa có lịch hẹn nào với khách</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Lên lịch hẹn dẫn khách xem các bất động sản phù hợp trong kho hàng.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          {apt.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          {apt.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <strong className="text-slate-700">Thời gian:</strong> {formatDateVN(apt.startDateTime)}
                        </div>
                        <div>
                          <strong className="text-slate-700">Địa điểm:</strong> {apt.location || 'Tại BĐS'}
                        </div>
                        <div>
                          <strong className="text-slate-700">Mã BĐS:</strong> {apt.propertyCode || '---'}
                        </div>
                      </div>
                      {apt.content && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          {apt.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SMART PROPERTY MATCHING */}
          {activeTab === 'MATCHING' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Gợi ý nguồn hàng phù hợp với tiêu chí khách
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động lọc các bất động sản còn trống khớp với nhu cầu, tầm giá và khu vực
                  </p>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                  {matchedProperties.length} BĐS phù hợp
                </span>
              </div>

              {matchedProperties.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                  <Building className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">Không tìm thấy nguồn hàng khớp 100%</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Hiện chưa có căn nào hoàn toàn thỏa mãn tất cả tiêu chí về ngân sách và vị trí. Bạn có thể mở rộng khu vực tìm kiếm hoặc thêm nguồn hàng mới.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedProperties.map((prop) => (
                    <div
                      key={prop.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {prop.code}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {prop.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                          {prop.title}
                        </h4>
                        <div className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{prop.address}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Mức giá:</span>
                            <span className="font-extrabold text-rose-600 text-sm">
                              {formatVND(prop.salePrice || prop.rentPriceMonthly || prop.transferPrice || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Diện tích:</span>
                            <span className="font-bold text-slate-900">{prop.landArea} m²</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Môi giới nắm:</span>
                            <span className="font-medium text-slate-700 truncate max-w-[100px] block">
                              {prop.assignedAgentName || '---'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Khớp tiêu chí
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              // Log sending property
                              await addAppointment({
                                title: `Dẫn khách xem ${prop.code} - ${prop.title}`,
                                type: 'XEM_NHA',
                                customerId: customer.id,
                                customerName: customer.fullName,
                                propertyId: prop.id,
                                propertyCode: prop.code,
                                propertyTitle: prop.title,
                                assignedAgentId: currentUser?.id || 'admin',
                                agentName: currentUser?.fullName || 'Môi giới',
                                startDateTime: new Date(Date.now() + 86400000).toISOString(),
                                location: prop.address,
                                content: `Lịch hẹn dẫn khách xem BĐS phù hợp ${prop.code}`,
                                status: 'CHUA_DIEN_RA',
                              });
                              setActiveTab('APPOINTMENTS');
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Calendar className="w-3 h-3 text-amber-400" />
                            Lên lịch dẫn xem
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Hồ sơ khách hàng: <strong>{customer.fullName}</strong> ({customer.code})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddInteractionOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
              Ghi nhật ký chăm sóc
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {isAddInteractionOpen && (
        <AddInteractionModal
          isOpen={isAddInteractionOpen}
          onClose={() => setIsAddInteractionOpen(false)}
          customer={customer}
        />
      )}

      {isReassignOpen && (
        <ReassignCustomerModal
          isOpen={isReassignOpen}
          onClose={() => setIsReassignOpen(false)}
          customer={customer}
        />
      )}
    </div>
  );
};
