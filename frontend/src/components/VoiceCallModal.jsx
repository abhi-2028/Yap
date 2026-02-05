import React, { useState, useEffect, useRef } from 'react';
import { useCallStore } from '../store/useCallStore';
import { Phone, PhoneOff, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const VoiceCallModal = () => {
  const {
    callState,
    caller,
    receiver,
    callStartTime,
    answerCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
  } = useCallStore();

  const { authUser } = useAuthStore();
  const [callDuration, setCallDuration] = useState(0);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Update call duration
  useEffect(() => {
    if (callState === 'active' && callStartTime) {
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCallDuration(0);
    }
  }, [callState, callStartTime]);

  // Set up audio streams
  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true; // Mute local audio to prevent echo
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // No cleanup needed
    };
  }, []);

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!callState || callState === 'idle') return null;

  // Determine which user to display based on who the current user is
  const otherUser = caller?._id === authUser?._id ? receiver : caller;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 w-[400px] border border-slate-700/50">
        {/* Audio elements */}
        <audio ref={localAudioRef} autoPlay playsInline />
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Profile Picture */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-cyan-500/30 overflow-hidden">
              <img
                src={otherUser?.profilePic || '/avatar.png'}
                alt={otherUser?.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Pulse animation for active calls */}
            {callState === 'active' && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500 animate-ping opacity-75"></div>
                <div className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-pulse"></div>
              </>
            )}
          </div>

          {/* User Name */}
          <h2 className="text-2xl font-semibold text-slate-100">
            {otherUser?.fullName}
          </h2>

          {/* Call Status */}
          <div className="text-center">
            {callState === 'calling' && (
              <p className="text-slate-400 text-lg animate-pulse">Calling...</p>
            )}
            {callState === 'incoming' && (
              <p className="text-cyan-400 text-lg font-medium animate-pulse">
                Incoming Call
              </p>
            )}
            {callState === 'active' && (
              <p className="text-cyan-400 text-xl font-mono font-semibold">
                {formatDuration(callDuration)}
              </p>
            )}
            {callState === 'rejected' && (
              <p className="text-red-400 text-lg font-medium">Call Rejected</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6 mt-8">
            {callState === 'incoming' && (
              <>
                {/* Answer Button */}
                <button
                  onClick={answerCall}
                  className="group relative w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-green-500/50 transition-all duration-200 flex items-center justify-center"
                  title="Answer Call"
                >
                  <Phone className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
                </button>

                {/* Reject Button */}
                <button
                  onClick={rejectCall}
                  className="group relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-red-500/50 transition-all duration-200 flex items-center justify-center"
                  title="Reject Call"
                >
                  <PhoneOff className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
                </button>
              </>
            )}

            {(callState === 'calling' || callState === 'active') && (
              <button
                onClick={endCall}
                className="group relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-red-500/50 transition-all duration-200 flex items-center justify-center"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
              </button>
            )}

            {callState === 'rejected' && (
              <button
                onClick={() => {
                  useCallStore.setState({ callState: 'idle', caller: null, receiver: null });
                }}
                className="group relative w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 shadow-lg transition-all duration-200 flex items-center justify-center"
                title="Close"
              >
                <X className="w-7 h-7 text-white" />
              </button>
            )}
          </div>

          {/* Connection Status Indicator */}
          {callState === 'active' && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Connected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCallModal;
