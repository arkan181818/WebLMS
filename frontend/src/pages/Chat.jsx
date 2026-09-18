import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MessageCircle, Send, User as UserIcon } from 'lucide-react';
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
      const interval = setInterval(() => fetchMessages(selectedContact.id), 5000);
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
        setContacts(res.data);
      } else {
        // Murid: cukup chat ke guru (kita ambil daftar guru)
        const res = await api.get('/api/users/teachers');
        setContacts(res.data);
      }
    } catch (err) {
      toast.error('Gagal memuat kontak');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const res = await api.get(`/api/chat/${contactId}`);
      setMessages(res.data);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 ml-64 flex flex-col h-screen">
        {/* Chat Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Contact List */}
          <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {user.role === 'guru' ? 'Murid Aktif' : 'Mentor Saya'}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  <UserIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  Belum ada kontak tersedia.
                </div>
              ) : (
                contacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${
                      selectedContact?.id === c.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold uppercase">
                      {c.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-semibold text-slate-800 text-sm truncate">{c.full_name}</h4>
                      <p className="text-xs text-slate-500 truncate">{c.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-slate-50">
            {!selectedContact ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <MessageCircle className="w-20 h-20 mb-4 text-slate-200" />
                <h3 className="text-xl font-bold text-slate-500 mb-1">Pilih Kontak untuk Memulai</h3>
                <p className="text-sm">Klik salah satu nama di sebelah kiri untuk membuka percakapan.</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold uppercase">
                    {selectedContact.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{selectedContact.full_name}</h3>
                    <p className="text-xs text-slate-500">{selectedContact.email}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center text-slate-400 text-sm mt-10">
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
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        m.sender_id === user.id
                          ? 'bg-primary text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                      }`}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="bg-white px-6 py-4 border-t border-slate-200 flex items-center gap-3 shrink-0">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Ketik pesan..."
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-11 h-11 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
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
