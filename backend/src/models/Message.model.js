import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  image: {
    type: String,
  },
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
    index: true,
  },
  clientMessageId: {
    type: String,
    index: true,
    sparse: true,
  },
}, { timestamps: true });

// Compound indexes for bidirectional 1-to-1 message history lookups (ESR rule)
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

// Single-field indexes for conversation aggregation matching
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;