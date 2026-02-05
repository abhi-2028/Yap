import { XIcon, PhoneCall } from 'lucide-react'
import { useChatStore } from '../store/useChatStore.js'
import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore.js'
import { useCallStore } from '../store/useCallStore.js'
import toast from 'react-hot-toast'

const ChatHeader = () => {
    const { selectedChat, setSelectedChat } = useChatStore()
    const { onlineUsers } = useAuthStore()
    const { initiateCall, callState } = useCallStore()
    const isOnline = onlineUsers.includes(selectedChat._id);

    const handleCallClick = () => {
        if (!isOnline) {
            toast.error(`${selectedChat.fullName} is offline`);
            return;
        }

        if (callState && callState !== 'idle') {
            toast.error('A call is already in progress');
            return;
        }

        initiateCall(selectedChat);
    };

    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') setSelectedChat(null)
        }

        window.addEventListener("keydown", handleEscKey)

        return () => {
            window.removeEventListener("keydown", handleEscKey)
        }
    }, [selectedChat])

    return (
        <div className='flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 max-h-[84px] px-6 flex-1'>
            <div className='flex items-center space-x-3'>
                <div className={`avatar ${isOnline ? "online" : "offline"}`}>
                    <div className='w-12 rounded-full'>
                        <img src={selectedChat.profilePic || "/avatar.png"} alt={selectedChat.fullName} />
                    </div>
                </div>
                <div>
                    <h3 className='text-slate-200 font-medium'>{selectedChat.fullName}</h3>
                    <p className='text-slate-400 text-sm'>{`${isOnline ? 'Online' : 'Offline'}`}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={handleCallClick} disabled={!isOnline}>
                    <PhoneCall className={`w-5 h-5 transition-colors cursor-pointer ${
                        isOnline 
                            ? 'text-cyan-400 hover:text-cyan-300' 
                            : 'text-slate-600 cursor-not-allowed'
                    }`} />
                </button>

                <button onClick={() => setSelectedChat(null)}>
                    <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
                </button>
            </div>

        </div>
    )
}

export default ChatHeader