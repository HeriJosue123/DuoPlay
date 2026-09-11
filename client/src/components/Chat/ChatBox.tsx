import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import type { Room } from '../../types';

export const ChatBox = ({ room }: { room: Room }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [unread, setUnread] = useState(0);
  const { socket, playerId } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatCount = room.chat.length;
  const previousCountRef = useRef(chatCount);

  useEffect(() => {
    if (chatCount > previousCountRef.current) {
      if (!isOpen) {
        setUnread(prev => prev + (chatCount - previousCountRef.current));
      } else {
        scrollToBottom();
      }
    }
    previousCountRef.current = chatCount;
  }, [chatCount, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      scrollToBottom();
    }
  }, [isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    socket?.emit('send_chat', { roomId: room.roomId, playerId, text: message.trim() });
    setMessage('');
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95 z-40 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageCircle size={24} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
            {unread}
          </span>
        )}
      </button>

      {/* Chat Drawer/Modal */}
      <div className={`fixed inset-0 z-50 pointer-events-none ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
        {/* Backdrop for mobile */}
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'} sm:hidden`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Panel */}
        <div className={`absolute bottom-0 sm:bottom-6 sm:right-6 w-full sm:w-80 h-[60vh] sm:h-[500px] panel-dark border-t sm:border border-[#333] sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full sm:translate-y-12 sm:scale-95'}`}>
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-[#333] bg-[#111] sm:rounded-t-2xl">
            <h3 className="font-black text-white tracking-widest text-sm flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-500" />
              CHAT
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors active:scale-90">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {room.chat.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-xs font-bold text-slate-500">Inicia la conversación en esta sesión.</p>
              </div>
            ) : (
              room.chat.map((msg, i) => {
                const isMe = msg.playerId === playerId;
                const showName = i === 0 || room.chat[i-1].playerId !== msg.playerId;
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showName && (
                      <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1 mr-1">
                        {isMe ? 'TÚ' : msg.playerName.toUpperCase()}
                      </span>
                    )}
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-[#222] text-white border border-[#333] rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#333] bg-[#0a0a0a] sm:rounded-b-2xl">
            <div className="relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button 
                type="submit"
                disabled={!message.trim()}
                className="absolute right-2 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:bg-[#333] transition-colors"
              >
                <Send size={14} className={message.trim() ? 'ml-[2px]' : ''} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
