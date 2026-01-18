import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'
import { ENV } from '../lib/ENV.js'

export const protectRoute = async (req, res, next) => {
    try{
        const token = req.cookies.jwt
        if(!token) return res.status(401).json({message: "Not authorized, no token"})

        const decoded = jwt.verify(token, ENV.JWT_SECRET)

        if(!decoded) {
            return  res.status(401).json({message: "Not authorized, token failed"})
        }

        const user = await User.findById(decoded.userId).select('-password')
        if(!user){
            return res.status(401).json({message: "Not authorized, user not found"})
        }

        req.user = user
        next()
    }catch(err){
        console.error("Error in auth middleware: ", err)
        return res.status(401).json({message: "Not authorized, token failed"})
    }
}