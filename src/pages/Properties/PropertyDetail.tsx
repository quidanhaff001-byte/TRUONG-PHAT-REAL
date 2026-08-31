import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Share2,
  Edit,
  Trash2,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Compass,
  Layers,
  FileCheck,
  DollarSign,
  UserCheck,
  ExternalLink,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Key,
  Printer,
  Copy,
  Check,
  MessageSquare,
  Send,
  Clock,
  Car,
  Home,
  CheckSquare,
} from 'lucide-react';
import { formatVND, formatArea, formatDimensions, formatDate, maskPhoneNumber } from '../../utils/formatters';
import { generateZaloBrief, printPropertyListReport } from '../../utils/exportUtils';
import { StatusBadge, TransactionBadge } from '../../components/common/Badge';
import { PropertyShareModal } from './PropertyShareModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { PropertyStatus } from '../../types';

export const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, updatePropertyStatus, deleteProperty, updateProperty } = useData();
  const { currentUser, canEditProperty, canViewConfidentialOwner, isAdmin } = useAuth();
  const { success } = useToast();

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [copiedZalo, setCopiedZalo] = useState<boolean>(false);
  const [newLogNote, setNewLogNote] = useState<string>('');
  const [localLogs, setLocalLogs] = useState<{ id: string; user: string; text: string; time: string }[]>([
    {
      id: '1',
      user: 'Trần Văn Mạnh (Admin)',
      text: 'Tiếp nhận nguồn hàng, đã thẩm định pháp lý sổ hồng và quy hoạch đất ở đô thị.',
      time: '2 ngày trước',
    },
    {
      id: '2',
      user: 'Lê Minh Tuấn (Trưởng nhóm)',
      text: 'Đã khảo sát thực tế, chụp ảnh và lấy chìa khóa gửi tại ban quản lý.',
      time: '1 ngày trước',
    },
  ]);

  const property = properties.find((p) => p.id === id);

  if (!property) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs max-w-xl mx-auto my-12">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Không tìm thấy bất động sản</h2>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Sản phẩm có thể đã bị xóa hoặc đường dẫn không chính xác.
        </p>
        <button
          onClick={() => navigate('/properties')}
          className="px-5 py-2.5 bg-[#001f3f] text-white rounded-xl text-xs font-bold hover:bg-[#002e5c]"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const isOwnerVisible = canViewConfidentialOwner(property.createdBy, property.assignedAgentId);
  const canEdit = canEditProperty(property.createdBy, property.assignedAgentId);
  const allImages = property.images && property.images.length > 0 ? property.images : property.coverImage ? [property.coverImage] : [];

  const handleStatusChange = async (newStatus: PropertyStatus) => {
    await updatePropertyStatus(property.id, newStatus);
    success('Đã cập nhật trạng thái', newStatus);
  };

  const handleCopyZalo = () => {
    const text = generateZaloBrief(property);
    navigator.clipboard.writeText(text);
    setCopiedZalo(true);
    success('Đã sao chép tin đăng Zalo', `Nội dung rút gọn của mã ${property.code} đã sẵn sàng.`);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  const handlePrintSheet = () => {
    printPropertyListReport([property], `PHIẾU TIẾP NHẬN & KHẢO SÁT BĐS - MÃ ${property.code}`);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNote.trim()) return;
    const newEntry = {
      id: Date.now().toString(),
      user: `${currentUser?.fullName || 'Nhân sự'} (${currentUser?.role || 'Môi giới'})`,
      text: newLogNote.trim(),
      time: 'Vừa xong',
    };
    setLocalLogs((prev) => [newEntry, ...prev]);
    setNewLogNote('');
    success('Đã lưu nhật ký hoạt động', 'Ghi chú khảo sát / dẫn khách đã được lưu lại.');
  };

  const handleDelete = async () => {
    await deleteProperty(property.id);
    navigate('/properties');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="p-2 text-gray-500 hover:text-[#001f3f] rounded-xl hover:bg-gray-100 transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-[#001f3f] bg-[#D4AF37]/20 px-2.5 py-0.5 rounded-md border border-[#D4AF37]/40">
                {property.code}
              </span>
              <TransactionBadge type={property.transactionType} />
              <StatusBadge status={property.status} />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#001f3f] mt-1 leading-snug">
              {property.title}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Status Select */}
          {canEdit && (
            <select
              value={property.status}
              onChange={(e) => handleStatusChange(e.target.value as PropertyStatus)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#D4AF37] shadow-xs cursor-pointer"
            >
              <option value="Đang bán">Đang bán</option>
              <option value="Đang cho thuê">Đang cho thuê</option>
              <option value="Đang sang nhượng">Đang sang nhượng</option>
              <option value="Mới tiếp nhận">Mới tiếp nhận</option>
              <option value="Chờ xác minh">Chờ xác minh</option>
              <option value="Có khách quan tâm">Có khách quan tâm</option>
              <option value="Đang thương lượng">Đang thương lượng</option>
              <option value="Đã nhận cọc">Đã nhận cọc</option>
              <option value="Đã hoàn tất">Đã hoàn tất</option>
              <option value="Tạm ngưng giao dịch">Tạm ngưng giao dịch</option>
            </select>
          )}

          {/* Copy Zalo Quick Button */}
          <button
            type="button"
            onClick={handleCopyZalo}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-xs"
            title="Sao chép tóm tắt định dạng chuẩn Zalo"
          >
            {copiedZalo ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedZalo ? 'Đã sao chép!' : 'Tin Zalo'}</span>
          </button>

          {/* Print Sheet */}
          <button
            type="button"
            onClick={handlePrintSheet}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors shadow-xs"
            title="In phiếu thông tin tiếp nhận BĐS"
          >
            <Printer className="w-3.5 h-3.5 text-[#001f3f]" />
            <span>In phiếu</span>
          </button>

          {/* Share Modal */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#001f3f] border border-[#D4AF37]/40 rounded-xl text-xs font-bold transition-colors shadow-xs"
            title="Tạo bài đăng mạng xã hội & QR"
          >
            <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Tạo tin đăng</span>
          </button>

          {/* Edit */}
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate(`/properties/${property.id}/edit`)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#001f3f] hover:bg-[#002e5c] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Edit className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Chỉnh sửa</span>
            </button>
          )}

          {/* Delete */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Xóa vào thùng rác"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Highlights Grid: Gallery (Left) & Key Summary Box (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Photo Gallery: 7 Cols */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative h-80 sm:h-96 rounded-2xl bg-gray-900 overflow-hidden border border-gray-200 shadow-xs flex items-center justify-center">
            {allImages.length > 0 ? (
              <img
                src={allImages[activeImageIndex] || allImages[0]}
                alt={property.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-gray-400 p-6">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <span className="text-xs">Chưa có hình ảnh bất động sản</span>
              </div>
            )}

            {allImages.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-[#001f3f]/85 backdrop-blur-xs text-[#D4AF37] text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border border-[#D4AF37]/30">
                {activeImageIndex + 1} / {allImages.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    activeImageIndex === idx
                      ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30 scale-105'
                      : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Key Summary & Pricing: 5 Cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            {/* Price Box */}
            <div className="p-5 bg-[#001f3f] text-white rounded-2xl shadow-md border border-white/10">
              <div className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-bold">
                Mức giá niêm yết
              </div>
              <div className="text-3xl font-black text-white mt-1">
                {property.salePrice
                  ? formatVND(property.salePrice)
                  : property.rentPriceMonthly
                  ? `${formatVND(property.rentPriceMonthly)} / tháng`
                  : property.transferPrice
                  ? `Sang nhượng ${formatVND(property.transferPrice)}`
                  : 'Thương lượng trực tiếp'}
              </div>
              {property.salePrice && property.landArea && (
                <div className="text-xs text-gray-300 mt-1.5">
                  Đơn giá đất: <strong className="text-[#D4AF37]">{formatVND(Math.round(property.salePrice / property.landArea))}</strong> / m²
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[11px] text-gray-500 font-semibold block">Diện tích đất</span>
                <span className="font-black text-[#001f3f] text-sm">{formatArea(property.landArea)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[11px] text-gray-500 font-semibold block">Kích thước (N x D)</span>
                <span className="font-black text-[#001f3f] text-sm">{formatDimensions(property.width, property.length)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[11px] text-gray-500 font-semibold block">Hướng nhà</span>
                <span className="font-bold text-[#001f3f] text-sm">{property.direction || 'Đông Nam'}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[11px] text-gray-500 font-semibold block">Pháp lý</span>
                <span className="font-bold text-emerald-700 text-sm truncate">{property.legalType || 'Sổ hồng riêng'}</span>
              </div>
            </div>

            {/* Address */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-start gap-2 text-xs text-gray-700">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#001f3f] block">Địa chỉ tài sản:</span>
                  <span className="text-gray-600 mt-0.5 block">{property.address}</span>
                </div>
              </div>
            </div>

            {/* Assigned Agent Box */}
            <div className="p-3.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#001f3f] text-[#D4AF37] flex items-center justify-center font-bold text-xs border border-[#D4AF37]/50">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-[#001f3f] font-semibold">Môi giới phụ trách</div>
                  <div className="text-xs font-bold text-[#001f3f]">{property.assignedAgentName || 'Chưa phân công'}</div>
                </div>
              </div>
              {property.teamName && (
                <span className="text-[10px] font-bold text-[#001f3f] bg-[#D4AF37]/20 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                  {property.teamName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Specifications & Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Technical Specifications, Description & Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Highlights & Description */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#001f3f] flex items-center gap-2 border-b border-gray-100 pb-3">
              <Building2 className="w-4 h-4 text-[#D4AF37]" />
              Mô tả chi tiết & Điểm nổi bật
            </h3>

            {property.highlights && (
              <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl text-xs text-[#001f3f] font-semibold leading-relaxed">
                ⭐ {property.highlights}
              </div>
            )}

            <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
              {property.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <span className="text-xs font-bold text-[#001f3f] block mb-2">Tiện ích & Điểm cộng:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {property.amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-lg"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Full Specifications Table */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#001f3f] flex items-center gap-2 border-b border-gray-100 pb-3">
              <Layers className="w-4 h-4 text-[#D4AF37]" />
              Thông số kỹ thuật & Kết cấu công trình
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block font-medium">Loại BĐS:</span>
                <span className="font-bold text-gray-900">{property.propertyType}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Diện tích sàn:</span>
                <span className="font-bold text-gray-900">{property.usableArea ? formatArea(property.usableArea) : 'Chưa rõ'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Số tầng:</span>
                <span className="font-bold text-gray-900">{property.floors ? `${property.floors} tầng` : 'Nhà trệt'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Phòng ngủ / WC:</span>
                <span className="font-bold text-gray-900">{property.bedrooms || 0} PN / {property.bathrooms || 0} WC</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Đường trước nhà:</span>
                <span className="font-bold text-gray-900">{property.roadWidth ? `${property.roadWidth}m (Ô tô)` : 'Hẻm thông'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Kết cấu:</span>
                <span className="font-bold text-gray-900">{property.structure || 'Bê tông cốt thép'}</span>
              </div>
            </div>
          </div>

          {/* Legal & Cadastral */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#001f3f] flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileCheck className="w-4 h-4 text-[#D4AF37]" />
              Pháp lý & Thông số địa chính
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block font-medium">Tình trạng pháp lý:</span>
                <span className="font-bold text-emerald-700">{property.legalType || 'Sổ hồng riêng'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Số thửa đất:</span>
                <span className="font-mono font-bold text-gray-900">{property.cadastralLotNumber || 'Chưa cập nhật'}</span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Số tờ bản đồ:</span>
                <span className="font-mono font-bold text-gray-900">{property.cadastralSheetNumber || 'Chưa cập nhật'}</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-gray-500 block font-medium">Quy hoạch:</span>
                <span className="font-semibold text-gray-900">{property.planningStatus || 'Đất ở đô thị lâu dài, không vướng quy hoạch'}</span>
              </div>
            </div>
          </div>

          {/* Activity Log / Inspection Notes */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-[#001f3f] flex items-center gap-2 border-b border-gray-100 pb-3">
              <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
              Nhật ký khảo sát & Dẫn khách xem nhà
            </h3>

            {/* Log form */}
            <form onSubmit={handleAddLog} className="flex gap-2">
              <input
                type="text"
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                placeholder="Ghi chú kết quả dẫn khách, phản hồi của chủ nhà..."
                className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#001f3f] hover:bg-[#002e5c] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Lưu</span>
              </button>
            </form>

            {/* Log List */}
            <div className="space-y-3 pt-2">
              {localLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <div className="flex items-center justify-between text-gray-500 text-[11px] mb-1">
                    <span className="font-bold text-[#001f3f]">{log.user}</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {log.time}
                    </span>
                  </div>
                  <p className="text-gray-800 font-medium">{log.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Confidential Owner Details & System Audit */}
        <div className="space-y-6">
          {/* Owner Confidential Information Box */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-[#001f3f] flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                Thông tin chủ nhà
              </h3>
              {isOwnerVisible ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Được ủy quyền
                </span>
              ) : (
                <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gray-400" />
                  Bảo mật SĐT
                </span>
              )}
            </div>

            {isOwnerVisible ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-500 block font-medium">Tên chủ nhà:</span>
                  <span className="font-bold text-gray-900 text-sm">{property.ownerName}</span>
                </div>

                <div>
                  <span className="text-gray-500 block font-medium">Số điện thoại liên hệ:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono font-bold text-base text-gray-900">
                      {property.ownerPhone}
                    </span>
                    <a
                      href={`tel:${property.ownerPhone}`}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-colors"
                    >
                      Gọi ngay
                    </a>
                  </div>
                </div>

                {property.ownerRelationship && (
                  <div>
                    <span className="text-gray-500 block font-medium">Mối quan hệ:</span>
                    <span className="font-semibold text-gray-800">{property.ownerRelationship}</span>
                  </div>
                )}

                {property.keysLocation && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                    <span className="font-bold flex items-center gap-1 text-[11px] mb-0.5">
                      <Key className="w-3.5 h-3.5" />
                      Chìa khóa & Mật mã:
                    </span>
                    <span className="font-medium">{property.keysLocation}</span>
                  </div>
                )}

                {property.ownerContactNote && (
                  <div>
                    <span className="text-gray-500 block font-medium">Lưu ý khi gọi:</span>
                    <span className="text-gray-700 italic">{property.ownerContactNote}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center mx-auto">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-gray-800">Thông tin được bảo mật</div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Liên hệ <strong>{property.assignedAgentName || 'Trưởng phòng quản lý nguồn'}</strong> hoặc Quản trị viên để được cấp quyền mở khóa số điện thoại và địa chỉ căn này.
                </p>
              </div>
            )}
          </div>

          {/* System Audit & Metadata Box */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-[#001f3f] border-b border-gray-100 pb-2">Nhật ký tạo & cập nhật</h4>
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Ngày tiếp nhận:</span>
                <span className="font-semibold text-gray-900">{formatDate(property.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Người tạo nguồn:</span>
                <span className="font-semibold text-gray-900">{property.createdByName || 'Hệ thống'}</span>
              </div>
              <div className="flex justify-between">
                <span>Cập nhật lần cuối:</span>
                <span className="font-semibold text-gray-900">{formatDate(property.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share / Marketing Modal */}
      <PropertyShareModal
        property={property}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa bất động sản"
        message={`Bạn có chắc muốn chuyển bất động sản "${property.title}" (${property.code}) vào thùng rác?`}
        confirmText="Chuyển vào thùng rác"
        variant="danger"
      />
    </div>
  );
};
