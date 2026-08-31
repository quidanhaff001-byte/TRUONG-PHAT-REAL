import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, CustomerInteraction } from '../../types';
import {
  X,
  PhoneCall,
  Users,
  MessageSquare,
  Eye,
  Send,
  FileEdit,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface AddInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const INTERACTION_TYPES: {
  type: CustomerInteraction['type'];
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { type: 'CALL', label: 'Gọi điện thoại', icon: PhoneCall, color: 'text-emerald-600 bg-emerald-50' },
  { type: 'ZALO', label: 'Nhắn tin Zalo / SMS', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
  { type: 'MEETING', label: 'Gặp mặt tư vấn', icon: Users, color: 'text-purple-600 bg-purple-50' },
  { type: 'VIEWING', label: 'Dẫn khách xem BĐS', icon: Eye, color: 'text-amber-600 bg-amber-50' },
  { type: 'SEND_PROPERTY', label: 'Gửi thông tin sản phẩm', icon: Send, color: 'text-indigo-600 bg-indigo-50' },
  { type: 'NOTE', label: 'Ghi chú nội bộ', icon: FileEdit, color: 'text-slate-600 bg-slate-100' },
];

export const AddInteractionModal: React.FC<AddInteractionModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { addCustomerInteraction, updateCustomer } = useData();
  const { currentUser } = useAuth();

  const [type, setType] = useState<CustomerInteraction['type']>('CALL');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newStatus, setNewStatus] = useState<Customer['status']>(customer.status);
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionNote, setNextActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung chi tiết buổi làm việc/tương tác');
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultTitle =
        title.trim() ||
        `${INTERACTION_TYPES.find((t) => t.type === type)?.label} với ${customer.fullName}`;

      await addCustomerInteraction(customer.id, {
        date: new Date().toISOString(),
        type,
        title: defaultTitle,
        content: content.trim(),
        agentId: currentUser?.id || 'admin',
        agentName: currentUser?.fullName || 'Môi giới phụ trách',
        nextActionDate: nextActionDate ? new Date(nextActionDate).toISOString() : undefined,
        nextActionNote: nextActionNote.trim() || undefined,
      });

      // Update customer status if changed
      if (newStatus !== customer.status) {
        await updateCustomer(customer.id, { status: newStatus });
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-amber-400" />
              Ghi nhật ký chăm sóc: {customer.fullName} ({customer.code})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Lưu lại kết quả trao đổi, phản hồi của khách và đặt lịch nhắc việc tiếp theo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Interaction Type Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Hình thức tương tác <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {INTERACTION_TYPES.map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setType(item.type)}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : item.color
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề tóm tắt (Tùy chọn)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Trao đổi thêm về phương thức thanh toán căn Thảo Điền"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung chi tiết & Phản hồi của khách hàng <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ghi rõ: Khách đã xem những gì, thích hoặc chê điểm nào, mức giá khách có thể chốt, thắc mắc về pháp lý..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
            />
            {error && <p className="text-[11px] text-rose-500 mt-1">{error}</p>}
          </div>

          {/* Status update */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cập nhật trạng thái khách sau tương tác
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200 font-medium"
              >
                <option value="Mới tiếp nhận">Mới tiếp nhận</option>
                <option value="Đang tư vấn">Đang tư vấn</option>
                <option value="Đã gửi sản phẩm">Đã gửi sản phẩm</option>
                <option value="Đã hẹn xem">Đã hẹn xem</option>
                <option value="Đang thương lượng">Đang thương lượng</option>
                <option value="Đã giao dịch">Đã giao dịch thành công</option>
                <option value="Tạm dừng">Tạm dừng</option>
                <option value="Không có nhu cầu">Không có nhu cầu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Lịch hẹn chăm sóc tiếp theo (Nhắc việc)
              </label>
              <input
                type="datetime-local"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
              />
            </div>
          </div>

          {nextActionDate && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú nội dung cần thực hiện ở lần hẹn tiếp theo
              </label>
              <input
                type="text"
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
                placeholder="VD: Gọi lại sau khi khách bàn bạc với gia đình"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:border-slate-900 ring-slate-200"
              />
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu nhật ký'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
