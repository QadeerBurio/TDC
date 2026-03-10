// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const dns = require("dns");
const connectDB = require("./config/db");

const app = express();

// ---------------- DNS CONFIG ----------------
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ---------------- ROUTES ----------------
app.use("/api/auth", require("./routes/auth.routes"));
// app.use("/api/profile", require("./routes/profile.routes")); // Uncomment if needed
app.use("/api/universities", require("./routes/university.routes"));
app.use("/api/offers", require("./routes/offer.routes"));
app.use("/api/brands", require("./routes/brands.routes"));
app.use("/api/notification", require("./routes/notification.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

// ---------------- DATABASE ----------------
connectDB();

// ---------------- SERVER ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));