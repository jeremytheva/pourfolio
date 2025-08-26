import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiSend, FiUser, FiMoreHorizontal, FiPhone, FiVideo } = FiIcons;

function Chat() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState({});
  const messagesEndRef = useRef(null);

  // Dummy contacts
  const contacts = [
    { id: 1, name: 'John Smith', avatar: '👨', status: 'online', lastMessage: 'That IPA was amazing!', time: '2m ago' },
    { id: 2, name: 'Sarah Wilson', avatar: '👩', status: 'offline', lastMessage: 'Have you tried the new stout?', time: '1h ago' },
    { id: 3, name: 'Mike Johnson', avatar: '👱‍♂️', status: 'online', lastMessage: 'Thanks for the beer recommendation', time: '3h ago' },
    { id: 4, name: 'Lisa Brown', avatar: '👩‍🦰', status: 'away', lastMessage: 'The brewery tour was great!', time: '1d ago' },
    { id: 5, name: 'Tom Davis', avatar: '🧔', status: 'online', lastMessage: 'Let\'s grab a beer sometime', time: '2d ago' }
  ];

  // Initialize dummy messages
  useEffect(() => {
    const dummyMessages = {
      1: [
        { id: 1, text: 'Hey! Did you try that new IPA from Brewery X?', sender: 'them', timestamp: new Date(Date.now() - 3600000) },
        { id: 2, text: 'Yes! It was incredible. The hop profile was perfect.', sender: 'me', timestamp: new Date(Date.now() - 3500000) },
        { id: 3, text: 'That IPA was amazing!', sender: 'them', timestamp: new Date(Date.now() - 120000) }
      ],
      2: [
        { id: 1, text: 'Have you tried the new stout?', sender: 'them', timestamp: new Date(Date.now() - 3600000) },
        { id: 2, text: 'Not yet, is it good?', sender: 'me', timestamp: new Date(Date.now() - 3500000) }
      ],
      3: [
        { id: 1, text: 'Thanks for the beer recommendation', sender: 'them', timestamp: new Date(Date.now() - 10800000) }
      ]
    };
    setMessages(dummyMessages);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedContact]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedContact) return;

    const newMessage = {
      id: Date.now(),
      text: message,
      sender: 'me',
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMessage]
    }));

    setMessage('');

    // Simulate response after 2 seconds
    setTimeout(() => {
      const responses = [
        "That sounds great!",
        "I'll definitely check it out.",
        "Thanks for sharing!",
        "Interesting, tell me more.",
        "I agree completely!"
      ];
      
      const response = {
        id: Date.now() + 1,
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'them',
        timestamp: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [selectedContact.id]: [...(prev[selectedContact.id] || []), response]
      }));
    }, 2000);
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[700px] flex"
      >
        {/* Contacts Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Messages</h2>
            <p className="text-sm text-gray-600">Chat with your brew buddies</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {contacts.map((contact) => (
              <motion.button
                key={contact.id}
                whileHover={{ backgroundColor: '#f9fafb' }}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-4 text-left border-b border-gray-100 transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-amber-50 border-amber-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                      {contact.avatar}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-800 truncate">{contact.name}</h3>
                      <span className="text-xs text-gray-500">{contact.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{contact.lastMessage}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {selectedContact.avatar}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(selectedContact.status)}`}></div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{selectedContact.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{selectedContact.status}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <SafeIcon icon={FiPhone} className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <SafeIcon icon={FiVideo} className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <SafeIcon icon={FiMoreHorizontal} className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages[selectedContact.id]?.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender === 'me' 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'me' ? 'text-amber-200' : 'text-gray-500'
                      }`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white p-2 rounded-full transition-colors"
                  >
                    <SafeIcon icon={FiSend} className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* No Chat Selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SafeIcon icon={FiUser} className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a contact to start chatting about beer!</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default Chat;