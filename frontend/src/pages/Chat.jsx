import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MessageCircle, Send, User as UserIcon, Sparkles } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Chat({ user, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
      const interval = setInterval(() => fetchMessages(selectedContact.id), 4000);
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      if (user.role === 'guru') {
        const res = await api.get('/api/users/students');
        setContacts(res.data || []);
      } else {
        const res = await api.get('/api/users/teachers');
        setContacts(res.data || []);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar kontak');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const res = await api.get(`/api/chat/${contactId}`);
      setMessages(res.data || []);
    } catch (err) { /* silent */ }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;
    try {
      await api.post(`/api/chat/${selectedContact.id}`, { content: newMessage });
      setNewMessage('');
      fetchMessages(selectedContact.id);
    } catch (err) {
      toast.error('Gagal mengirim pesan');
    }
  };

  if (loading) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-bg flex">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 ml-64 flex flex-col h-screen relative z-10">
        <div className="flex flex-1 overflow-hidden">
          
          {/* Contact List / Daftar Mentor */}
          <div className="w-80 bg-[#0B1120]/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col">
            <div className="p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-primary-light" />
                {user.role === 'guru' ? 'Daftar Murid Aktif' : 'Konsultasi Mentor'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {user.role === 'guru' ? 'Pilih murid untuk membuka percakapan' : 'Pilih mentor untuk mulai sesi konsultasi'}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  <UserIcon className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                  {user.role === 'guru' ? 'Belum ada murid aktif.' : 'Belum ada Mentor/Guru yang terdaftar.'}
                </div>
              ) : (
                contacts.map(c => {
                  const name = c.full_name || c.display_name || c.username || 'Pengguna';
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-all duration-200 border-b border-white/[0.03] ${
                        selectedContact?.id === c.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0 ${
                        selectedContact?.id === c.id
                          ? 'bg-gradient-to-br from-primary to-violet text-white shadow-lg shadow-primary/30'
                          : 'bg-white/10 text-slate-400'
                      }`}>
                        {name.charAt(0)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold text-sm truncate ${selectedContact?.id === c.id ? 'text-white' : 'text-slate-300'}`}>
                            {name}
                          </h4>
                        </div>
                        {user.role === 'murid' ? (
                          <div className="space-y-0.5 mt-0.5">
                            <p className="text-[11px] text-primary-light font-medium truncate">
                              🏫 {c.campus || c.username || 'Kampus'}
                            </p>
                            {(c.department || c.semester) && (
                              <p className="text-[10px] text-slate-400 truncate">
                                🎓 {c.department || 'Jurusan'}{c.semester ? ` • ${c.semester}` : ''}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 truncate">{c.email}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {!selectedContact ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-5 border border-white/10 shadow-xl">
                  <MessageCircle className="w-12 h-12 text-primary-light" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {user.role === 'guru' ? 'Pilih Murid untuk Membuka Chat' : 'Pilih Mentor Konsultasi'}
                </h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  {user.role === 'guru'
                    ? 'Klik nama murid di panel sebelah kiri untuk membalas konsultasi atau memberikan feedback.'
                    : 'Pilih salah satu Mentor/Guru dari daftar di sebelah kiri untuk melihat Kampus, Jurusan, Semester dan memulai sesi konsultasi 1-on-1.'}
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="bg-[#0B1120]/80 backdrop-blur-xl px-6 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-primary to-violet rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shadow-lg shadow-primary/20">
                      {(selectedContact.full_name || selectedContact.username || 'M').charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">
                        {selectedContact.full_name || selectedContact.username}
                      </h3>
                      {user.role === 'murid' && (
                        <p className="text-xs text-slate-300 font-medium flex items-center gap-2">
                          <span className="text-primary-light font-semibold">🏫 {selectedContact.campus || selectedContact.username}</span>
                          {(selectedContact.department || selectedContact.semester) && (
                            <span className="text-slate-400">• 🎓 {selectedContact.department || ''} {selectedContact.semester ? `(${selectedContact.semester})` : ''}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    {selectedContact.email}
                  </span>
                </div>

                {/* Messages Container */}
                <div
                  className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
                  style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,27,75,0.3) 100%)' }}
                >
                  {messages.length === 0 && (
                    <div className="text-center text-slate-500 text-sm mt-10">
                      Belum ada pesan. Mulai percakapan sekarang!
                    </div>
                  )}
                  {messages.map(m => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                          m.sender_id === user.id
                            ? 'bg-gradient-to-r from-primary to-violet text-white rounded-br-md shadow-lg shadow-primary/20'
                            : 'bg-white/[0.07] text-slate-200 border border-white/10 rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? 'text-white/60' : 'text-slate-500'}`}>
                          {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Input */}
                <form onSubmit={handleSend} className="bg-[#0B1120]/80 backdrop-blur-xl px-6 py-4 border-t border-white/[0.06] flex items-center gap-3 shrink-0">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="input-field flex-1"
                    placeholder={`Ketik pesan untuk ${selectedContact.full_name || selectedContact.username}...`}
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-11 h-11 bg-gradient-to-r from-primary to-violet text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 disabled:opacity-40 transition-all shrink-0"
                  >
                    <Send size={18} />
                  </motion.button>
                </form>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
