import express from 'express'
import { login, signup, logout, updateProfile } from '../controllers/auth.controller.js'
import { protectRoute } from '../middleware/auth.middleware.js'
import { arcjetProtection } from '../middleware/arcjet.middleware.js'
import {
  validateRequest,
  signupSchema,
  loginSchema,
  updateProfileSchema,
} from '../middleware/validate.middleware.js'

const router = express.Router()

router.use(arcjetProtection)

router.post('/signup', validateRequest(signupSchema), signup)
router.post('/login', validateRequest(loginSchema), login)
router.post('/logout', logout)

router.put('/update-profile', protectRoute, validateRequest(updateProfileSchema), updateProfile)

router.get('/check', protectRoute, (req, res) => res.status(200).json(req.user));

export default router
