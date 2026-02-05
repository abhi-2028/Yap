import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

export const useCallStore = create((set, get) => ({
  // Call state
  callState: null, // 'idle', 'calling', 'incoming', 'active', 'rejected', 'ended'
  caller: null, // User who initiated the call
  receiver: null, // User receiving the call
  callStartTime: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,

  // WebRTC configuration
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],

  // Initialize call
  initiateCall: async (receiverData) => {
    const { authUser, socket } = useAuthStore.getState();
    
    if (!socket) {
      toast.error("Connection error. Please try again.");
      return;
    }

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      set({
        callState: "calling",
        caller: authUser,
        receiver: receiverData,
        localStream: stream,
      });

      // Create peer connection
      const pc = new RTCPeerConnection(get().iceServers);
      set({ peerConnection: pc });

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: receiverData._id,
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-offer", {
        offer,
        to: receiverData._id,
        from: authUser,
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error("Could not access microphone. Please check permissions.");
      get().endCall();
    }
  },

  // Handle incoming call
  handleIncomingCall: async ({ offer, from }) => {
    const { authUser } = useAuthStore.getState();
    
    set({
      callState: "incoming",
      caller: from,
      receiver: authUser,
    });

    // Store the offer for when user accepts
    set({ pendingOffer: offer });
  },

  // Answer call
  answerCall: async () => {
    const { socket } = useAuthStore.getState();
    const { pendingOffer, caller, iceServers } = get();

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      set({ localStream: stream });

      // Create peer connection
      const pc = new RTCPeerConnection(iceServers);
      set({ peerConnection: pc });

      // Add local stream tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: caller._id,
          });
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      socket.emit("call-answer", {
        answer,
        to: caller._id,
      });

      set({
        callState: "active",
        callStartTime: Date.now(),
        pendingOffer: null,
      });
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Could not access microphone. Please check permissions.");
      get().rejectCall();
    }
  },

  // Reject call
  rejectCall: () => {
    const { socket } = useAuthStore.getState();
    const { caller, localStream } = get();

    if (caller) {
      socket.emit("call-reject", { to: caller._id });
    }

    // Clean up local stream if exists
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    set({
      callState: "idle",
      caller: null,
      receiver: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      pendingOffer: null,
    });
  },

  // Handle call answer
  handleCallAnswer: async ({ answer }) => {
    const { peerConnection } = get();

    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      set({
        callState: "active",
        callStartTime: Date.now(),
      });
    }
  },

  // Handle call rejection
  handleCallRejection: () => {
    const { localStream, peerConnection } = get();

    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }

    set({
      callState: "rejected",
      localStream: null,
      remoteStream: null,
      peerConnection: null,
    });

    // Reset to idle after showing rejected state
    setTimeout(() => {
      set({ callState: "idle", caller: null, receiver: null });
    }, 3000);
  },

  // Handle ICE candidate
  handleIceCandidate: async ({ candidate }) => {
    const { peerConnection } = get();

    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  },

  // End call
  endCall: () => {
    const { socket } = useAuthStore.getState();
    const { authUser } = useAuthStore.getState();
    const { caller, receiver, localStream, remoteStream, peerConnection } = get();

    // Determine the other user's ID by checking who we are
    let otherUserId = null;
    
    if (authUser) {
      // If I'm the caller, notify the receiver
      if (caller?._id === authUser._id) {
        otherUserId = receiver?._id;
      } 
      // If I'm the receiver, notify the caller
      else if (receiver?._id === authUser._id) {
        otherUserId = caller?._id;
      }
    }

    if (otherUserId && socket) {
      console.log("Sending call-end to user:", otherUserId);
      socket.emit("call-end", { to: otherUserId });
    } else {
      console.log("Could not send call-end - otherUserId:", otherUserId, "socket:", !!socket, "authUser:", authUser?._id, "caller:", caller?._id, "receiver:", receiver?._id);
    }

    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }

    set({
      callState: "idle",
      caller: null,
      receiver: null,
      callStartTime: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      pendingOffer: null,
    });
  },

  // Handle call end from other user
  handleCallEnd: () => {
    console.log("Call ended by other user");
    const { localStream, remoteStream, peerConnection } = get();

    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }

    set({
      callState: "idle",
      caller: null,
      receiver: null,
      callStartTime: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      pendingOffer: null,
    });
  },

  // Subscribe to call events
  subscribeToCallEvents: () => {
    const { socket } = useAuthStore.getState();
    
    if (!socket) {
      console.error("Cannot subscribe to call events: socket not available");
      return;
    }

    console.log("Subscribing to call events");

    // Use arrow functions to ensure we always call the latest store methods
    socket.on("call-offer", (data) => {
      console.log("Received call-offer event", data);
      get().handleIncomingCall(data);
    });
    
    socket.on("call-answer", (data) => {
      console.log("Received call-answer event", data);
      get().handleCallAnswer(data);
    });
    
    socket.on("call-reject", () => {
      console.log("Received call-reject event");
      get().handleCallRejection();
    });
    
    socket.on("call-end", () => {
      console.log("Received call-end event");
      get().handleCallEnd();
    });
    
    socket.on("ice-candidate", (data) => {
      console.log("Received ice-candidate event", data);
      get().handleIceCandidate(data);
    });
  },

  // Unsubscribe from call events
  unsubscribeFromCallEvents: () => {
    const { socket } = useAuthStore.getState();
    
    if (!socket) return;

    console.log("Unsubscribing from call events");
    socket.off("call-offer");
    socket.off("call-answer");
    socket.off("call-reject");
    socket.off("call-end");
    socket.off("ice-candidate");
  },
}));
