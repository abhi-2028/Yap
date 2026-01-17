import { generateToken } from '../lib/utils.js';
import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';

export const signup =  async (req, res) => {
  const { fullName, email, password } = req.body

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if(password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    }


    // check email using Regex
    let emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }

    const user = await User.findOne({ email })
    if (user) return  res.status(400).json({ message: 'User already exists' })

    const salt = await bcrypt.genSalt(15)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword
    })

    if(newUser) {
        generateToken(newUser._id, res)
        await newUser.save()

        return res.status(201).json({
            _id: newUser._id, 
            fullName: newUser.fullName, 
            email: newUser.email,
            profilePic: newUser.profilePic
        })
    }else{
        return res.status(400).json({ message: 'Invalid user data' })
    }
  } catch (err) {
    console.log(`Error in signup: ${err.message}`);
    return res.status(500).json({ message: 'Internal server error' })
  }
}