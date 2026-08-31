import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showText?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  showText = true,
}) => {
  const safeTotal = typeof totalItems === 'number' && !isNaN(totalItems) ? Math.max(0, totalItems) : 0;
  const safePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
  const safeCurrentPage = typeof currentPage === 'number' && currentPage > 0 ? currentPage : 1;

  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const startIndex = safeTotal === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;
  const endIndex = Math.min(safeCurrentPage * safePageSize, safeTotal);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 w-full">
      {showText && (
        <p className="text-xs text-slate-500">
          Hiển thị <span className="font-semibold text-slate-800">{startIndex}</span> -{' '}
          <span className="font-semibold text-slate-800">{endIndex}</span> trên tổng số{' '}
          <span className="font-semibold text-slate-800">{safeTotal}</span> bản ghi
        </p>
      )}

      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center gap-1"
          aria-label="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 ||
              p === totalPages ||
              Math.abs(p - safeCurrentPage) <= 1
          )
          .map((page, idx, arr) => {
            const prev = arr[idx - 1];
            const isGap = prev && page - prev > 1;

            return (
              <React.Fragment key={page}>
                {isGap && <span className="px-1.5 text-slate-400 text-xs">...</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    safeCurrentPage === page
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            );
          })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold flex items-center gap-1"
          aria-label="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

