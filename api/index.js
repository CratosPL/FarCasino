const express = require("express");
const cors = require("cors");
const app = express();

// Konfiguracja CORS
app.use(cors({
  origin: "https://play.farcade.ai"
}));

// Przykładowy endpoint
app.post("/init", (req, res) => {
  res.json({ message: "Hello from server!" });
});

module.exports = app;
