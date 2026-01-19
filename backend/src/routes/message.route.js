import express from "express";
const router = express.Router();
import {
  getAllContacts,
  getMessagesById,
  sendMessage,
  getChatList,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatList);
router.get("/:id", getMessagesById);
router.post("/send/:id", sendMessage);

export default router;
