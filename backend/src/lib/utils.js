import jwt from 'jsonwebtoken';
import { ENV } from './ENV.js';

export const generateToken = (userId, res) => {
    const {JWT_SECRET} = ENV
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
    }

    const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: '7d',
    });

    res.cookie("jwt", token, {
        httpOnly: true, //prevents XXS attack: cross site scripting
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
        secure: ENV.NODE_ENV === 'production', // set secure flag in production
    });

    return token;
}