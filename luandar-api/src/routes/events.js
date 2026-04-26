const router = require("express").Router()
const axios = require("axios")
const db = require("../db")
const auth = require("../middleware/auth")

// Public — guest submits booking
router.post("/", async (req, res) => {
  const {
    nome, email, telefone, tipo_evento, data_evento,
    turno, hora_inicio, hora_fim, num_convidados,
    decoracao, catering, dj, som,
    preco_base, total, forma_pagamento, pedidos
  } = req.body

  try {
    const { rows } = await db.query(`
      INSERT INTO events (
        nome, email, telefone, tipo_evento, data_evento,
        turno, hora_inicio, hora_fim, num_convidados,
        decoracao, catering, dj, som,
        preco_base, total, forma_pagamento, pedidos
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      ) RETURNING *`,
      [nome, email, telefone, tipo_evento, data_evento,
       turno, hora_inicio, hora_fim, num_convidados,
       decoracao, catering, dj, som,
       preco_base, total, forma_pagamento, pedidos]
    )

    const event = rows[0]

    // Send push notification to admin
    try {
      const tokenResult = await db.query(
        "SELECT push_token FROM admins WHERE push_token IS NOT NULL LIMIT 1"
      )
      if (tokenResult.rows.length > 0) {
        await axios.post("https://exp.host/--/api/v2/push/send", {
          to: tokenResult.rows[0].push_token,
          title: "Nova Reserva ◆",
          body: `${event.nome} · ${event.tipo_evento} · ${new Date(event.data_evento).toLocaleDateString("pt-PT")}`,
          sound: "default",
          channelId: "reservas",
          priority: "high",
        })
      }
    } catch {
      // never block the booking if push fails
    }

    res.status(201).json(event)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Admin only — get all events
router.get("/", auth, async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM events ORDER BY created_at DESC"
  )
  res.json(rows)
})

// Admin only — update status
router.patch("/:id/status", auth, async (req, res) => {
  const { status } = req.body
  const { rows } = await db.query(
    "UPDATE events SET status=$1 WHERE id=$2 RETURNING *",
    [status, req.params.id]
  )
  res.json(rows[0])
})

// Admin only — delete
router.delete("/:id", auth, async (req, res) => {
  await db.query("DELETE FROM events WHERE id=$1", [req.params.id])
  res.json({ success: true })
})

// Public — check availability for a date
router.get("/availability", async (req, res) => {
  const { date } = req.query
  const { rows } = await db.query(
    "SELECT turno FROM events WHERE data_evento=$1 AND status != 'cancelled'",
    [date]
  )
  const booked = rows.map(r => r.turno)
  const all = ["manha", "tarde", "noite", "dia_inteiro"]
  const available = booked.includes("dia_inteiro")
    ? []
    : all.filter(t => t !== "dia_inteiro" && !booked.includes(t))
  res.json({ date, booked, available })
})

module.exports = router