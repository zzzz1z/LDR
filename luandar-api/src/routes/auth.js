const router = require("express").Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const db = require("../db")
const authenticate = require("../middleware/auth")

// Create first admin (run once, then remove or protect this route)
router.post("/setup", async (req, res) => {
  const { email, password, secret } = req.body

  if (secret !== process.env.SETUP_SECRET) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const hash = await bcrypt.hash(password, 10)
  const { rows } = await db.query(
    "INSERT INTO admins (email, password) VALUES ($1, $2) RETURNING id, email",
    [email, hash]
  )
  res.json(rows[0])
})

router.post("/push-token", authenticate, async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: "Token required" })
  await db.query("UPDATE admins SET push_token = $1", [token])
  res.json({ ok: true })
})

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body
  const { rows } = await db.query(
    "SELECT * FROM admins WHERE email = $1", [email]
  )
  const admin = rows[0]
  if (!admin) return res.status(401).json({ error: "Invalid credentials" })

  const valid = await bcrypt.compare(password, admin.password)
  if (!valid) return res.status(401).json({ error: "Invalid credentials" })

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  )
  res.json({ token })
})

module.exports = router