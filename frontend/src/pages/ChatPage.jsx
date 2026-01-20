import React from 'react'
import { useAuthStore } from '../store/useAuthStore.js'

const ChatPage = () => {

  const { logout, isCheckingAuth } = useAuthStore();


  return (
    <div  className='z-10'>
      <button 
        onClick={logout} 
        disabled={isCheckingAuth}
        className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed z-10'
      >
        {isCheckingAuth ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  )
}

export default ChatPage