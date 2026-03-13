const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { storage } = require("../config/cloudinary"); 
const Slider = require("../models/Slider"); // Your unified model
const Notification = require("../models/Notification");
const Job = require("../models/Job");
const User = require("../models/User"); // ADDED
const auth = require("../middleware/auth.middleware"); // ADDED

// // --- Storage Configuration ---
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
// });
const upload = multer({ storage });

// --- Routes ---
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: "Access denied. Admins only." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- USER MANAGEMENT ROUTES ---

// Get users by role (Used by AdminUserList.js)
router.get("/users/:role", auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    const users = await User.find({ role })
      .populate("university", "name")
      .select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Verification (Approve/Revoke)
router.post("/approve-user/:id", auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.status = user.status === "Verified" ? "Not Verified" : "Verified";
    await user.save();
    res.json({ message: "Status Updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. CREATE: Add new Slider or Offer
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { type, title, description, link } = req.body;
    if (!req.file) return res.status(400).json({ message: "Image is required" });

    const newEntry = new Slider({
      type, // 'slider' or 'offer'
      title,
      description,
      link,
      // image: `/uploads/${req.file.filename}`,
      image: req.file.path,
      active: true,
    });

    await newEntry.save();
    
    res.status(201).json({ message: "Content published!", data: newEntry });
       // BROADCAST NOTIFICATION - Fixed variable names
    // BROADCAST NOTIFICATION
try {
  await Notification.create({
    recipient: null, // Public broadcast
    title: "New Exclusive Offer! 🔥",
    description: `A new deal has been posted: ${newEntry.title}! Check it out now.`,
    type: "Offers", 
    icon: "megaphone",
    link: newEntry._id.toString()
  });
    } catch (nError) {
        console.error("Notification failed to send:", nError);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ: Get all items (Used by the Combined Slider)

router.get("/all", async (req, res) => {
  try {
    const { type } = req.query;
    // We only want items where active is explicitly NOT false
    const filter = { active: { $ne: false } }; 
    
    if (type) {
      filter.type = type;
    }

    const items = await Slider.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. UPDATE: Toggle Active Status (Hide/Show on App)
router.patch("/toggle/:id", async (req, res) => {
  try {
    const item = await Slider.findById(req.params.id);
    item.active = !item.active;
    await item.save();
    res.json({ message: "Status updated", active: item.active });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE: Remove an item
router.delete("/delete/:id", async (req, res) => {
  try {
    await Slider.findByIdAndDelete(req.params.id);
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// GET users by role (student or brand)
// Get users by role (student/brand)
router.get("/users/:role", auth, async (req, res) => {
  try {
    const users = await User.find({ role: req.params.role })
      .populate("university", "name")
      .select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Verification
router.post("/approve-user/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.status = user.status === "Verified" ? "Not Verified" : "Verified";
    await user.save();
    res.json({ message: "Status Updated", user });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/verify-user/:targetUserId", auth, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.targetUserId, { isVerified: true }, { new: true });

    await Notification.create({
  recipient: updatedUser._id, // Private
  title: "Account Verified! ✅",
  description: "Your student status is verified. You can now claim premium discounts!",
  type: "System",
  icon: "sparkles",
});

    res.json({ message: "User verified and notified." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Jobs Portal API's


// Create a new Job
router.post("/jobs/add", auth, isAdmin, async (req, res) => {
    try {
        const newJob = new Job(req.body);
        await newJob.save();
        res.status(201).json({ message: "Job posted successfully", data: newJob });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get all jobs (Admin view)
router.get("/jobs/all", auth, isAdmin, async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get only active jobs for the mobile app
router.get("/jobs/public", async (req, res) => {
    try {
        const jobs = await Job.find({ active: true }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ADMIN MANAGEMENT ---
// Toggle job status (Active/Inactive)
router.patch("/jobs/toggle/:id", auth, isAdmin, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        job.active = !job.active;
        await job.save();
        res.json({ message: "Status updated", active: job.active });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;