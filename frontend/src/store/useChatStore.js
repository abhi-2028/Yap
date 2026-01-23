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
    getMessageByUserId: async (userId) => {
        set({isMessagesLoading: true});
        try{
            const res = await axiosInstance.get(`/messages/${userId}`)
            set({ messages: res.data })
        }catch(error){
            toast.error(error.response?.data?.message || "Something went wrong");
        }finally{
            set({isMessagesLoading: false})
        }
    },

    sendMessage: async(messageData) => {
        const {selectedChat, messages} = get()
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
        } catch (error) {
            // remove optimistic message on failure
            set({messages: get().messages.filter(m => m._id !== tempId)})
            toast.error(error.response?.data?.message || "Something went wrong!");
        }
    }
}));