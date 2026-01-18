import express from 'express'
import {ENV} from './lib/ENV.js'
import path from 'path'

import authRoutes from './routes/auth.route.js'
import messageRoutes from './routes/message.route.js'
import { connectDB } from './lib/db.js'

const app = express()
const __dirname = path.resolve()

const PORT = ENV.PORT || 5000

app.use(express.json()) 

app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)

// Make ready for deployment
if (ENV.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))

  app.get('*', (_, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  connectDB()
})