import React, { useEffect } from 'react'
import { useChatStore } from '../store/useChatStore.js'
import { useAuthStore } from '../store/useAuthStore'
import ChatHeader from './ChatHeader.jsx'
import NoChatHistory from './NoChatHistory.jsx'
import MessageInput from './MessageInput.jsx'
import MessagesLoadingSkeleton from './MessagesLoadingSkeleton.jsx'

const ChatContainer = () => {
  const { selectedChat, getMessageByUserId, messages, isMessagesLoading } = useChatStore()
  const { authUser } = useAuthStore()

  useEffect(() => {
    if (selectedChat?._id) {
      getMessageByUserId(selectedChat._id)
    }
  },[selectedChat,getMessageByUserId])

  return (
    <>
      <ChatHeader/>
      <div className='flex-1 px-6 overflow-y-auto py-8'>
        {messages.length > 0 && !isMessagesLoading ? (
          <div className='max-w-3xl mx-auto space-y-6'>
            {messages.map(msg => (
              <div key={msg._id}
                className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"}`}
              >
                <div className={`chat-bubble relative ${msg.senderId === authUser._id ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"}`
              }>
                {msg.image && (
                  <img src={msg.image} alt="Shared" className='rounded-lg h-48 object-cover'/>
                )}
                {msg.text && <p className='mt-1'>{msg.text}</p>}
                <p className='text-xs mt-1 opacity-75 flex items-center gap-1'>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit"})}
                </p>
                </div>
              </div>
            ))}
          </div>
        ) : isMessagesLoading ? <MessagesLoadingSkeleton/> : (
          <NoChatHistory name={selectedChat.fullName}/>
        )}
      </div>
      <MessageInput/>
    </>
  )
}

export default ChatContainer