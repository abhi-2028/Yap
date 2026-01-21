import React from 'react'
import { Navigate, Route, Routes } from 'react-router'
import ChatPage from './pages/ChatPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import { useAuthStore } from './store/useAuthStore.js'
import { useEffect } from 'react'
import PageLoader from './components/PageLoader.jsx'
import { Toaster } from 'react-hot-toast'

const App = () => {

  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // console.log({ authUser })
  if(isCheckingAuth) return <PageLoader />

  return (
    <div className='min-h-screen bg-slate-900 relative flex items-center justify-center p-4 overflow-hidden'>
      
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#38bdf8_0%,transparent_55%)] opacity-20" />

      {/* Accent glow orbs */}
      <div className="absolute top-20 left-20 w-80 h-80 bg-purple-500 opacity-20 blur-[140px] rounded-full" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-500 opacity-20 blur-[140px] rounded-full" />

      <Toaster/>

      <Routes>
        <Route path="/" element={authUser? <ChatPage /> : <Navigate to={"/login"}/>} />
        <Route path="/login" element={!authUser? <LoginPage />:<Navigate to={"/"} />} />
        <Route path="/signup" element={!authUser? <SignupPage />:<Navigate to={"/"} />} />
      </Routes>

    </div>
  )
}

export default App