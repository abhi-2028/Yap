import {create} from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set,get) => ({
    allContacts: [],
    chats: [],
    messages: [],
    activeTab: 'chats',
    selectedChat: null,
    isUserLoading: false,
    isMessagesLoading: false,
    isSoundEnabled: localStorage.getItem('soundEnabled') === 'true',

    toggleSound: () => {
        localStorage.setItem('soundEnabled', !get().isSoundEnabled);
        set({isSoundEnabled: !get().isSoundEnabled});
    },

    setActiveTab: (tab) => set({activeTab: tab}),
    setSelectedChat: (selectedChat) => set({selectedChat}),

    getAllContacts: async () => {
        set({isUserLoading: true});
        try{
            const res = await axiosInstance.get('/messages/contacts');
            set({allContacts: res.data});
        }catch(error){
            toast.error(error.response?.data?.message || "Failed to load contacts. Please try again.");
        }finally{
            set({isUserLoading: false});
        }
    },

    getMyChats: async () => {
        set({isUserLoading: true});
        try {
            const res = await axiosInstance.get('/messages/chats');
            set({chats: res.data});
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load chats. Please try again.");
        }finally{
            set({isUserLoading: false});
        }
    },

    getMessageByUserId: async (userId, cursor = null) => {
        if (!cursor) {
            set({isMessagesLoading: true});
        }
        try{
            const url = cursor 
                ? `/messages/${userId}?cursor=${cursor}&limit=50` 
                : `/messages/${userId}?limit=50`;
            const res = await axiosInstance.get(url);

            if (cursor) {
                // Prepend older messages for pagination
                set({ messages: [...res.data, ...get().messages] });
            } else {
                set({ messages: res.data });
            }
        }catch(error){
            toast.error(error.response?.data?.message || "Something went wrong");
        }finally{
            if (!cursor) {
                set({isMessagesLoading: false});
            }
        }
    },

    sendMessage: async(messageData) => {
        const {selectedChat, messages, chats} = get()
        const {authUser} = useAuthStore.getState()
        const tempId = `temp-${Date.now()}`

        const optimisticMessage = {
            _id: tempId,
            senderId:  authUser._id,
            receiverId: selectedChat._id,
            text: messageData.text,
            image: messageData.image,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        }
        // update the ui immediately after sending message
        set({messages: [...messages, optimisticMessage]})

        try{
            const res = await axiosInstance.post(`/messages/send/${selectedChat._id}`, messageData)
            set({messages: get().messages.filter(m => m._id !== tempId).concat(res.data)})

            // Move this chat partner to the top of recent chats
            const partnerIndex = chats.findIndex(c => c._id === selectedChat._id);
            if (partnerIndex !== -1) {
                const updatedChat = { 
                    ...chats[partnerIndex], 
                    lastMessageText: res.data.text, 
                    lastMessageAt: res.data.createdAt 
                };
                set({ chats: [updatedChat, ...chats.filter(c => c._id !== selectedChat._id)] });
            }
        } catch (error) {
            // remove optimistic message on failure
            set({messages: get().messages.filter(m => m._id !== tempId)})
            toast.error(error.response?.data?.message || "Something went wrong!");
        }
    },

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket
        if(!socket) return

        // Prevent duplicate listeners
        socket.off("newMessage");

        socket.on("newMessage", (newMessage) => {
            const { selectedChat, isSoundEnabled, chats } = get()
            const authUserId = useAuthStore.getState().authUser?._id

            // Check if message belongs to active chat
            const isForSelectedChat = selectedChat && (
                newMessage.senderId === selectedChat._id || 
                newMessage.receiverId === selectedChat._id
            );

            if(isForSelectedChat) {
                set({ messages: [...get().messages, newMessage] });
            }

            // Always update chats list order so active conversations appear at top
            const partnerId = newMessage.senderId === authUserId 
                ? newMessage.receiverId 
                : newMessage.senderId;

            const existingIndex = chats.findIndex(c => c._id === partnerId);
            if (existingIndex !== -1) {
                const updatedChat = { 
                    ...chats[existingIndex], 
                    lastMessageText: newMessage.text, 
                    lastMessageAt: newMessage.createdAt 
                };
                set({ chats: [updatedChat, ...chats.filter(c => c._id !== partnerId)] });
            } else {
                // If partner is not in chat list, fetch fresh list
                get().getMyChats();
            }

            // Play notification sound
            if(isSoundEnabled){
                const notificationSound = new Audio('/sounds/notification.mp3')
                notificationSound.currentTime = 0
                notificationSound.play().catch((e) => console.log("Audio play failed:", e))
            }
        })
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket
        socket.off("newMessage")
    }
}));