import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Property } from '../../types';
import { formatVND, formatArea, formatDimensions } from '../../utils/formatters';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Share2, Facebook, MessageCircle, QrCode, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PropertyShareModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyShareModal: React.FC<PropertyShareModalProps> = ({ property, isOpen, onClose }) => {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'facebook' | 'zalo' | 'short' | 'qr'>('facebook');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !property) return null;

  const currentPriceText = property.salePrice
    ? formatVND(property.salePrice)
    : property.rentPriceMonthly
    ? `${formatVND(property.rentPriceMonthly)}/tháng`
    : property.transferPrice
    ? `Sang ${formatVND(property.transferPrice)}`
    : 'Thỏa thuận trực tiếp';

  const priceFormatted = showPrice ? `💰 GIÁ CHÍNH CHỦ: ${currentPriceText}` : '💰 GIÁ: Inbox / Liên hệ thương lượng';

  const generateFacebookPost = () => {
    return `🔥 [SIÊU PHẨM BẤT ĐỘNG SẢN] - ${property.title.toUpperCase()}
📍 Vị trí: ${property.street || property.district}, ${property.city}
${priceFormatted}

📐 THÔNG TIN CHI TIẾT:
• Diện tích: ${formatArea(property.landArea)} (${formatDimensions(property.width, property.length)})
• Kết cấu: ${property.structure || `${property.floors || 1} tầng`}
• Công năng: ${property.bedrooms || 0} phòng ngủ, ${property.bathrooms || 0} WC
• Hướng nhà: ${property.direction || 'Đông Nam mát mẻ'}
• Đường trước nhà: ${property.roadWidth ? `${property.roadWidth}m ô tô thông thoáng` : 'Đường rộng xe hơi'}
• Pháp lý: ${property.legalType || 'Sổ hồng riêng chính chủ, công chứng ngay'}

⭐ ĐIỂM NỔI BẬT:
${property.highlights || property.description.slice(0, 200)}

${property.amenities && property.amenities.length > 0 ? `✨ Tiện ích: ${property.amenities.join(', ')}\n` : ''}
📞 LIÊN HỆ XEM NHÀ & TƯ VẤN 24/7:
Môi giới phụ trách: ${property.assignedAgentName || 'Chuyên viên tư vấn TRUONG PHAT REAL'}
Hotline / Kỹ thuật: 0919 414 884 (Zalo/Call)

#TruongPhatReal #BatDongSan #${property.propertyType.replace(/\s+/g, '')} #${property.district.replace(/\s+/g, '')} #NhaDep`;
  };

  const generateZaloPost = () => {
    return `🏡 ${property.title}
📍 ${property.address}
${priceFormatted}
- DT: ${formatArea(property.landArea)} (${formatDimensions(property.width, property.length)})
- Kết cấu: ${property.structure || `${property.floors || 1} tầng`} | ${property.bedrooms || 0} PN, ${property.bathrooms || 0} WC
- Pháp lý: ${property.legalType || 'Sổ hồng riêng'}
- Điểm nhấn: ${property.highlights || 'Vị trí đẹp, khu vực an ninh dân trí cao'}

Anh/Chị quan tâm nhắn em gửi hình ảnh thực tế và hẹn lịch xem trực tiếp ạ!
LH: ${property.assignedAgentName || 'TRUONG PHAT REAL'} - 0919 414 884`;
  };

  const generateShortMessage = () => {
    return `Gửi Anh/Chị thông tin căn: ${property.code} - ${property.title}. DT ${formatArea(property.landArea)}, Giá: ${currentPriceText}. Pháp lý: ${property.legalType || 'Sổ hồng'}. Vị trí tại ${property.street || property.district}. Em hỗ trợ dẫn xem trực tiếp bất cứ lúc nào!`;
  };

  const getContent = () => {
    switch (activeTab) {
      case 'facebook':
        return generateFacebookPost();
      case 'zalo':
        return generateZaloPost();
      case 'short':
        return generateShortMessage();
      default:
        return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    success('Đã sao chép nội dung', 'Bạn có thể dán trực tiếp lên Facebook hoặc Zalo.');
    setTimeout(() => setCopied(false), 2500);
  };

  const propertyShareUrl = `${window.location.origin}/properties/${property.id}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tạo nội dung đăng tin & Chia sẻ</h3>
                <p className="text-xs text-slate-500">Mã BĐS: <strong className="text-amber-600">{property.code}</strong></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Privacy Security Note */}
          <div className="mt-3 p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[11px] text-sky-900">
            🔒 <strong>Bảo mật tự động:</strong> Toàn bộ số điện thoại chủ nhà, số tờ/số thửa bí mật và giá nội bộ đã được loại bỏ khỏi nội dung công khai.
          </div>

          {/* Tabs & Controls */}
          <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('facebook')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'facebook' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Facebook className="w-3.5 h-3.5" />
                Facebook
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('zalo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'zalo' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Zalo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('short')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'short' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Tin ngắn
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'qr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                Mã QR
              </button>
            </div>

            {activeTab !== 'qr' && (
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span>Hiển thị giá công khai</span>
              </label>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 mt-4 overflow-y-auto min-h-[220px]">
            {activeTab === 'qr' ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 inline-block mb-3">
                  <QRCodeSVG value={propertyShareUrl} size={180} level="M" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{property.title}</h4>
                <p className="text-xs text-slate-500 mt-1">Mã: {property.code} • {currentPriceText}</p>
                <p className="text-[11px] text-slate-400 mt-2 max-w-sm">
                  Quét mã QR bằng Camera điện thoại hoặc Zalo để mở nhanh chi tiết sản phẩm.
                </p>
              </div>
            ) : (
              <textarea
                readOnly
                value={getContent()}
                rows={10}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed resize-none"
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Đóng
            </button>

            {activeTab !== 'qr' ? (
              <button
                type="button"
                onClick={handleCopy}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép nội dung'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(propertyShareUrl);
                  success('Đã sao chép link', propertyShareUrl);
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Sao chép liên kết
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
