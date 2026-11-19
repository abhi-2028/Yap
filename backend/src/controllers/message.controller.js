import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.model.js";
import User from "../models/User.model.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    })
      .select("-password")
      .limit(limit)
      .sort({ fullName: 1 });

    res.status(200).json(filteredUsers);
  } catch (err) {
    console.log(`Error in getAllContacts: ${err.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessagesById = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChat } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const cursor = req.query.cursor; // Message _id for cursor-based pagination

    const filter = {
      $or: [
        { senderId: myId, receiverId: userToChat },
        { senderId: userToChat, receiverId: myId },
      ],
    };

    // If cursor provided, fetch messages older than the cursor (keyset pagination)
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Query newest messages first so limit captures the latest segment
    const messages = await Message.find(filter)
      .sort({ _id: -1 })
      .limit(limit);

    // Return in chronological order (oldest to newest) for standard chat display
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.log(`Error in getMessagesById: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, clientMessageId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const normalizedText = typeof text === "string" ? text.trim() : "";
    if (!normalizedText && !image) {
      return res
        .status(400)
        .json({ message: "Either text or image is required." });
    }

    if (senderId.equals(receiverId)) {
      return res
        .status(400)
        .json({ message: "You cannot send messages to yourself." });
    }

    // Idempotency check: if clientMessageId already processed for this sender, return existing
    if (clientMessageId) {
      const existingMessage = await Message.findOne({ senderId, clientMessageId });
      if (existingMessage) {
        return res.status(200).json(existingMessage);
      }
    }

    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;

    if (image) {
      const uploadResult = await cloudinary.uploader.upload(image);
      imageUrl = uploadResult.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text : normalizedText,
      image: imageUrl,
      clientMessageId: clientMessageId || undefined,
      status: "sent",
    });

    await newMessage.save();

    // Send message to receiver's distributed room across all active tabs/devices
    const receiverRoom = getReceiverSocketId(receiverId);
    io.to(receiverRoom).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.log(`Error in sendMessage: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { status } = req.body; // "delivered" | "read"
    const userId = req.user._id;

    if (!["delivered", "read"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only receiver can mark a message as delivered or read
    if (!message.receiverId.equals(userId)) {
      return res.status(403).json({ message: "Unauthorized to update status for this message" });
    }

    message.status = status;
    await message.save();

    // Notify the sender in real-time across instances
    const senderRoom = getReceiverSocketId(message.senderId);
    const eventName = status === "read" ? "messageReadReceipt" : "messageDeliveryReceipt";
    io.to(senderRoom).emit(eventName, {
      messageId: message._id,
      status,
      updatedAt: message.updatedAt,
    });

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in updateMessageStatus:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const syncOfflineMessages = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { since } = req.query; // ISO timestamp string

    const query = {
      receiverId: loggedInUserId,
    };

    if (since) {
      query.createdAt = { $gt: new Date(since) };
    } else {
      // Default to unread messages if no timestamp provided
      query.status = { $ne: "read" };
    }

    const missedMessages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(200);

    res.status(200).json(missedMessages);
  } catch (error) {
    console.error("Error in syncOfflineMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChatList = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Aggregation pipeline: runs inside MongoDB engine, utilizes indexes
    // Groups by chat partner, extracts latest message metadata, sorts descending, joins user details
    const chatPartners = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessageAt: { $first: "$createdAt" },
          lastMessageText: { $first: "$text" },
          lastMessageImage: { $first: "$image" },
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "partnerDetails",
        },
      },
      {
        $unwind: "$partnerDetails",
      },
      {
        $project: {
          _id: "$partnerDetails._id",
          fullName: "$partnerDetails.fullName",
          email: "$partnerDetails.email",
          profilePic: "$partnerDetails.profilePic",
          lastMessageAt: 1,
          lastMessageText: 1,
          lastMessageImage: 1,
        },
      },
    ]);

    res.status(200).json(chatPartners);
  } catch (error) {
    console.log("Error in getChatList: ", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};
