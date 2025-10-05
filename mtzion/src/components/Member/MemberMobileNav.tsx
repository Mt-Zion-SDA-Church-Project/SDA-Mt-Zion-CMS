import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, CreditCard, Calendar, BookOpen, Heart, QrCode } from 'lucide-react';
import logo from '../../assets/sda-logo.png';

type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/member/dashboard', icon: Home },
  { id: 'offertory', label: 'Give Offertory', href: '/member/offertory', icon: CreditCard },
  { id: 'events', label: 'Events', href: '/member/events', icon: Calendar },
  { id: 'resources', label: 'Resources', href: '/member/resources', icon: BookOpen },
  { id: 'birthdays', label: 'Birthdays', href: '/member/birthdays', icon: Heart },
  { id: 'qr', label: 'QR Check-in', href: '/member/qr-checkin', icon: QrCode }
];

interface MemberMobileNavProps {
  title?: string;
}

const MemberMobileNav: React.FC<MemberMobileNavProps> = ({ title = 'Member Portal' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const onNavigate = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="bg-white shadow-sm border-b lg:hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SDA Mt. Zion Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-800">{title}</h1>
            <p className="text-xs text-gray-600">Member Portal</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          aria-label="Open navigation menu"
          aria-expanded={open}
        >
          <Menu className={`w-6 h-6 text-gray-700 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="border-t bg-white shadow-lg relative z-50">
          {items.map((m) => (
            <button
              key={m.id}
              onClick={() => onNavigate(m.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isActive(m.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
            >
              <m.icon className="w-5 h-5" />
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberMobileNav;


