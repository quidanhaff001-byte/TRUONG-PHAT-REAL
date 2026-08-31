import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ExternalLink, X, Check } from 'lucide-react';
import { Property } from '../../types';
import { formatVND, formatArea } from '../../utils/formatters';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  reasons: string[];
  matchedProperties: Property[];
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  reasons,
  matchedProperties,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-amber-200 max-h-[90vh] flex flex-col"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 shrink-0 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Cảnh báo khả năng trùng lặp nguồn hàng
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Hệ thống phát hiện thông tin bạn vừa nhập có sự trùng khớp với bất động sản đã có trong hệ thống:
              </p>
            </div>
          </div>

          {/* Reasons List */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 mb-4">
            <h4 className="text-xs font-bold text-amber-900 mb-1.5 uppercase tracking-wide">
              Các yếu tố trùng khớp:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
              {reasons.map((r, i) => (
                <li key={i} className="leading-relaxed">
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Matched list */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4">
            <p className="text-xs font-semibold text-slate-700">Sản phẩm đã tồn tại:</p>
            {matchedProperties.map((p) => (
              <div
                key={p.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start gap-3 hover:border-slate-300 transition-colors"
              >
                {p.coverImage ? (
                  <img
                    src={p.coverImage}
                    alt={p.title}
                    referrerPolicy="no-referrer"
                    className="w-full sm:w-20 h-20 object-cover rounded-lg shrink-0"
                  />
                ) : (
                  <div className="w-full sm:w-20 h-20 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs shrink-0">
                    Không có ảnh
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      {p.code}
                    </span>
                    <span className="text-xs font-medium text-slate-600">{p.propertyType}</span>
                    <span className="text-xs text-emerald-700 font-semibold ml-auto">
                      {p.salePrice ? formatVND(p.salePrice) : p.rentPriceMonthly ? `${formatVND(p.rentPriceMonthly)}/tháng` : formatVND(p.transferPrice)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{p.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.address}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    <span>DT: {formatArea(p.landArea)}</span>
                    <span>Môi giới: <strong className="text-slate-700">{p.assignedAgentName || 'Chưa rõ'}</strong></span>
                    <span>Chủ nhà: {p.ownerName} ({p.ownerPhone})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Kiểm tra lại dữ liệu
            </button>
            <button
              type="button"
              onClick={onProceed}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Tôi đã kiểm tra, tiếp tục lưu
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
