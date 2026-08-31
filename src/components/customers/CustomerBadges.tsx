import React from 'react';

export const CustomerDemandBadge: React.FC<{ demandType: 'MUA' | 'THUE' | 'SANG_NHUONG' }> = ({ demandType }) => {
  switch (demandType) {
    case 'MUA':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Khách mua
        </span>
      );
    case 'THUE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          Khách thuê
        </span>
      );
    case 'SANG_NHUONG':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          Khách nhận sang nhượng
        </span>
      );
    default:
      return null;
  }
};

export const CustomerPotentialBadge: React.FC<{ level: string }> = ({ level }) => {
  switch (level) {
    case 'Nóng':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          Nóng (Ưu tiên cao)
        </span>
      );
    case 'Tiềm năng':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Tiềm năng
        </span>
      );
    case 'Tham khảo':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Tham khảo
        </span>
      );
    case 'Chưa phù hợp':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          Chưa phù hợp
        </span>
      );
    case 'Ngưng chăm sóc':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
          Ngưng chăm sóc
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {level}
        </span>
      );
  }
};

export const CustomerStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (status === 'Mới tiếp nhận') {
    style = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (status === 'Đang tư vấn') {
    style = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (status === 'Đã gửi sản phẩm') {
    style = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (status === 'Đã hẹn xem') {
    style = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (status === 'Đang thương lượng') {
    style = 'bg-orange-50 text-orange-800 border-orange-300';
  } else if (status === 'Đã giao dịch') {
    style = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
  } else if (status === 'Tạm dừng' || status === 'Không có nhu cầu') {
    style = 'bg-slate-100 text-slate-500 border-slate-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {status}
    </span>
  );
};
