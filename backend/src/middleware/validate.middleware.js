import { z } from "zod";

export const validateRequest = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed; // Use sanitized & parsed data
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstIssue = err.issues[0];
      return res.status(400).json({
        message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Validation failed",
        errors: err.issues,
      });
    }
    return res.status(400).json({ message: "Invalid request data" });
  }
};

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(50, "Full name is too long"),
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password is too long"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  profilePic: z.string().min(1, "Profile picture is required"),
});

export const sendMessageSchema = z.object({
  text: z.string().max(2000, "Message cannot exceed 2000 characters").optional().default(""),
  image: z.string().optional().nullable(),
  clientMessageId: z.string().optional(),
}).refine(
  (data) => (data.text && data.text.trim().length > 0) || (data.image && data.image.length > 0),
  { message: "Either text or image is required" }
);
