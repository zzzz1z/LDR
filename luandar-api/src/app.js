const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()
app.use(cors())
app.use(express.json())

app.use("/auth",   require("./routes/auth"))
app.use("/events", require("./routes/events"))

app.listen(process.env.PORT, () =>
  console.log(`Luandar API running on port ${process.env.PORT}`)
)