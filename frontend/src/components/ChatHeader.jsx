import { XIcon } from 'lucide-react'
import { useChatStore } from '../store/useChatStore.js'
import { useEffect } from 'react'

const ChatHeader = () => {
    const { selectedChat, setSelectedChat } = useChatStore()


    useEffect(() => {
        const handleEscKey = (event) => {
            if(event.key === 'Escape') setSelectedChat(null)
        }

        window.addEventListener("keydown", handleEscKey)

        return () => {
            window.removeEventListener("keydown", handleEscKey)
        }
    }, [selectedChat])

    return (
        <div className='flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 max-h-[84px] px-6 flex-1'>
            <div className='flex items-center space-x-3'>
                <div className='avatar online'>
                    <div className='w-12 rounded-full'>
                        <img src={selectedChat.profilePic || "/avatar.png"} alt={selectedChat.fullName} />
                    </div>
                </div>
                <div>
                    <h3 className='text-slate-200 font-medium'>{selectedChat.fullName}</h3>
                    <p className='text-slate-400 text-sm'>Online</p>
                </div>
            </div>

            <button onClick={() => setSelectedChat(null)}>
                <XIcon className='w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer' />
            </button>
        </div>
    )
}

export default ChatHeader