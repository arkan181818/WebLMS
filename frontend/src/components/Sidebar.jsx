import { useEffect, useState } from 'react';
import { LogOut, Home, BookOpen, PenTool, MessageCircle, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (user.role !== 'guru') return undefined;

    const fetchUnreadChatCount = async () => {
      try {
        const res = await api.get('/api/chat/unread');
        setUnreadChatCount(res.data.count || 0);
      } catch (err) {
        // Ignore polling failures so navigation remains available.
      }
    };

    fetchUnreadChatCount();
    const interval = setInterval(fetchUnreadChatCount, 5000);
    return () => clearInterval(interval);
  }, [user.role]);

  const handleLogout = async () => {
    try {
      await api.post('/api/logout');
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      onLogout();
      toast.success('Berhasil keluar');
    }
  };

  const navItems = user.role === 'guru' ? [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Users size={20} />, label: 'Daftar Murid', path: '/mentees' },
    { icon: <BookOpen size={20} />, label: 'Kelola Materi', path: '/materials' },
    { icon: <PenTool size={20} />, label: 'Review Tugas', path: '/assignments' },
    { icon: <MessageCircle size={20} />, label: 'Chat 1-on-1', path: '/chat' },
  ] : [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <BookOpen size={20} />, label: 'Materi Personal', path: '/materials' },
    { icon: <PenTool size={20} />, label: 'Tugas Saya', path: '/assignments' },
    { icon: <MessageCircle size={20} />, label: 'Konsultasi Mentor', path: '/chat' },
  ];

  return (
    <div className="w-64 h-screen flex flex-col fixed left-0 top-0 z-40 bg-[#0B1120]/90 backdrop-blur-2xl border-r border-white/[0.06]">
      {/* Logo */}
      <div className="p-6 border-b border-white/[0.06] flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-violet rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg leading-tight">RuangBelajar</h1>
          <span className="text-[10px] text-primary-light font-semibold uppercase tracking-widest">{user.role} Panel</span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div whileHover={{ x: 4 }} key={idx}>
              <Link
                to={item.path}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 to-violet/10 text-white font-semibold border border-primary/30 shadow-lg shadow-primary/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'
                }`}
              >
                <span className={isActive ? 'text-primary-light' : ''}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.path === '/chat' && user.role === 'guru' && unreadChatCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose text-white text-[11px] font-bold flex items-center justify-center">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* User info */}
      {(() => {
        const displayName = user?.display_name || user?.name || user?.full_name || user?.username || 'User';
        return (
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-cyan rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shadow-lg shadow-primary/20">
                {displayName.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="text-sm font-bold text-white truncate">{displayName}</h4>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-rose/80 hover:text-white hover:bg-rose/20 rounded-xl transition-all duration-300 font-medium text-sm border border-transparent hover:border-rose/30"
            >
              <LogOut size={18} /> Keluar
            </button>
          </div>
        );
      })()}
    </div>
  );
}
