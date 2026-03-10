const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const dns=require("dns")
const app = express();

dns.setServers(["1.1.1.1","8.8.8.8"])
app.use(cors());
// app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
// app.use("/api/profile", require("./routes/profile.routes")); 
app.use("/api/universities", require("./routes/university.routes"));
app.use("/api/offers", require("./routes/offer.routes"));
app.use("/api/brands", require("./routes/brands.routes")); // ✅ Fixed
app.use("/api/notification", require("./routes/notification.routes"))
app.use("/api/admin", require("./routes/admin.routes"))


// Connect MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
