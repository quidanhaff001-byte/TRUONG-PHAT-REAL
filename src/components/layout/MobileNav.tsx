import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building, Users2, UserCog, PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  onOpenCreateProperty: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenCreateProperty }) => {
  const { isTeamLeader } = useAuth();

  const allTabs = [
    { label: 'Tổng quan', path: '/', icon: LayoutDashboard, visible: true },
    { label: 'Nguồn hàng', path: '/properties', icon: Building, visible: true },
    { label: 'Thêm BĐS', isAction: true, icon: PlusCircle, onClick: onOpenCreateProperty, visible: true },
    { label: 'Khách hàng', path: '/customers', icon: Users2, visible: true },
    { label: 'Nhân sự', path: '/users', icon: UserCog, visible: isTeamLeader },
  ];

  const tabs = allTabs.filter((t) => t.visible);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {tabs.map((tab, idx) => {
        if (tab.isAction) {
          return (
            <button
              key={idx}
              onClick={tab.onClick}
              className="flex flex-col items-center justify-center p-1 text-[#001f3f] active:scale-95 transition-transform"
            >
              <div className="w-11 h-11 -mt-6 bg-[#D4AF37] rounded-full flex items-center justify-center text-[#001f3f] shadow-md border-2 border-white font-bold">
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-[#001f3f] mt-0.5">{tab.label}</span>
            </button>
          );
        }

        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path!}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
                isActive ? 'text-[#D4AF37] font-bold' : 'text-gray-500 hover:text-[#001f3f]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
