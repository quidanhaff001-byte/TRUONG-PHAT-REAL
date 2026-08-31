import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Building, CheckCircle2 } from 'lucide-react';

interface PlaceholderModuleProps {
  title: string;
  phase?: string;
  description: string;
  features: string[];
}

export const PlaceholderModule: React.FC<PlaceholderModuleProps> = ({
  title,
  phase = 'Phân hệ nghiệp vụ',
  description,
  features,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37]/15 text-[#001f3f] border border-[#D4AF37]/30">
            {phase}
          </span>
          <span className="text-xs text-slate-400">Đã sẵn sàng cấu trúc dữ liệu & TypeScript Schema</span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{description}</p>
        </div>

        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Các chức năng trong kế hoạch triển khai của Module:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={() => navigate('/properties')}
            className="flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            <span>Quay lại Nguồn hàng BĐS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
