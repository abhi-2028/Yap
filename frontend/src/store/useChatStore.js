import {create} from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

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
    }
}));