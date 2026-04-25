const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()
// After
app.use(cors({
  origin: [
    "https://ldrf.vercel.app",
    "http://localhost:4321", // keep this for local dev
  ]
}))
app.use(express.json())

app.use("/auth",   require("./routes/auth"))
app.use("/events", require("./routes/events"))

app.listen(process.env.PORT, () =>
  console.log(`Luandar API running on port ${process.env.PORT}`)
)