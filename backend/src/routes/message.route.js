import express from "express";
const router = express.Router();
import {
  getAllContacts,
  getMessagesById,
  sendMessage,
  getChatList,
  updateMessageStatus,
  syncOfflineMessages,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { validateRequest, sendMessageSchema } from "../middleware/validate.middleware.js";

router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatList);
router.get("/sync/unread", syncOfflineMessages);
router.put("/status/:id", updateMessageStatus);
router.get("/:id", getMessagesById);
router.post("/send/:id", validateRequest(sendMessageSchema), sendMessage);

export default router;
