require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const upload = multer({ storage });
const User = require("../models/User");
const University = require("../models/University");
const Notification = require("../models/Notification");
const Application = require("../models/Application");
const path = require("path");
const mongoose = require("mongoose");
const Package = require("../models/Package");
const router = express.Router();



// --- In-memory OTP store (replace with Redis for production) ---
const otpStore = {};

// --- Nodemailer setup ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    
  },
});


router.post("/signup", async (req, res) => {
  try {
    const {
      role,
      email,
      password,
      fullName,
      brandName,
      rollNo,
      isAlumni,
      phone,
      universityName,
      address,
      instagram,
      referralCodeInput,
    } = req.body;

    // 1️⃣ Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 2️⃣ Check existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already used" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let universityId = null;
    let name = "";

    // 4️⃣ Role Logic
    if (role === "student") {
      if (!fullName || !universityName) {
        return res
          .status(400)
          .json({ error: "Full name and university are required" });
      }

      name = fullName;

      let university = await University.findOne({ name: universityName });

      if (!university) {
        university = await University.create({ name: universityName });
      }

      universityId = university._id;
    }

    else if (role === "brand") {
      if (!brandName) {
        return res.status(400).json({ error: "Brand name required" });
      }

      name = brandName;
    }

    else if (role === "admin") {
      name = fullName || "Admin";
    }

    // 5️⃣ Referral lookup
    let referrer = null;

    if (referralCodeInput) {
      referrer = await User.findOne({
        referralCode: referralCodeInput.toUpperCase(),
      });
    }

    // 6️⃣ Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      rollNo,
      isAlumni: !!isAlumni,
      phone,
      university: universityId,
      address,
      instagram,
      status: role === "admin" ? "Verified" : "Not Verified",
      referredBy: referrer ? referrer._id : null,
    });

    // 7️⃣ Update referral count
    if (referrer) {
      const updatedReferrer = await User.findByIdAndUpdate(
        referrer._id,
        { $inc: { referralCount: 1 } },
        { new: true }
      );

      if (
        updatedReferrer.referralCount >= 10 &&
        !updatedReferrer.canApplyForTdcCard
      ) {
        updatedReferrer.canApplyForTdcCard = true;
        await updatedReferrer.save();
      }
    }

    // 8️⃣ Notification for student
    if (role === "student") {
      try {
        await Notification.create({
          recipient: user._id,
          title: "Welcome to the Crew! 🚀",
          description: `Hey ${name}! Your student account is ready.`,
          type: "System",
          icon: "party-popper",
          readBy: [],
        });

        transporter.sendMail({
          from: `"The Deft Crew" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Welcome to the Crew! 🚀",
          html: `<p>Welcome <b>${name}</b>! Your account is active.</p>`,
        }).catch(err => console.log("Mail Error:", err.message));

      } catch (err) {
        console.log("Notification Error:", err.message);
      }
    }

    // 9️⃣ Success response
    res.status(201).json({
      message: "Signup successful",
      user,
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      error: "Server error during signup",
    });
  }
});


// router.post(
// "/approve-user/:id",
// authMiddleware,
// adminMiddleware,
// async (req, res) => {

//   try {

//     const user = await User.findByIdAndUpdate(
//       req.params.id,
//       { status: "Verified" },
//       { new: true }
//     );

//     res.json({
//       message: "User verified",
//       user
//     });

//   } catch (err) {

//     res.status(500).json({ error: err.message });

//   }

// });
// -------------------- LOGIN --------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("university");

    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ message: "Invalid password" });

    // Inside your login/signup controller
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "180d" }, // This makes the token valid for 7 days
    );

    res.json({
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- FORGOT PASSWORD (SEND OTP) --------------------
// router.post("/forgot-password", async (req, res) => {
//   const { emailOrPhone } = req.body;
//   if (!emailOrPhone)
//     return res.status(400).json({ message: "Email or phone required" });

//   try {
//     const user = await User.findOne({
//       $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
//     });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     otpStore[user._id] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 minutes expiry

//     await transporter.sendMail({
//       from: `"E-Gift App" <${process.env.EMAIL_USER}>`,
//       to: user.email,
//       subject: "OTP for Password Reset",
//       html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
//     });

//     res.json({ message: "OTP sent successfully", userId: user._id });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
router.post("/forgot-password", async (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone) return res.status(400).json({ message: "Email or phone required" });

  try {
    const user = await User.findOne({
      $or: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }],
    });
    
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[user._id] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    // Use a separate try-catch for the email so the API still responds
    try {
      await transporter.sendMail({
        from: `"The Deft Crew" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "OTP for Password Reset",
        html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
      });
      
      return res.json({ message: "OTP sent successfully", userId: user._id });
    } catch (mailError) {
      console.error("MAIL_SYSTEM_ERROR:", mailError);
      return res.status(503).json({ 
        message: "Email service temporarily unavailable", 
        error: mailError.message 
      });
    }

  } catch (err) {
    console.error("SERVER_ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

// -------------------- VERIFY OTP --------------------
router.post("/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  const record = otpStore[userId];

  if (!record) return res.status(400).json({ message: "No OTP sent" });
  if (record.expires < Date.now())
    return res.status(400).json({ message: "OTP expired" });
  if (record.otp !== otp)
    return res.status(400).json({ message: "Invalid OTP" });

  const tempToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

  delete otpStore[userId];

  res.json({ message: "OTP verified", resetToken: tempToken });
});

// -------------------- RESET PASSWORD --------------------
router.post("/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword)
    return res.status(400).json({ message: "Token and new password required" });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    delete otpStore[decoded.id];

    res.json({ message: "Password reset successfully" });

  } catch (err) {
    res.status(400).json({ message: "Session expired. Please request a new OTP." });
  }
});
// ---------------- AUTH MIDDLEWARE ----------------
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ---------------- GET USER PROFILE ----------------
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("university");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ADMIN ONLY: APPROVE USER
router.post("/approve-user/:id", authMiddleware, async (req, res) => {
  // Add logic here to check if req.userId is an admin
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "Verified" },
      { new: true },
    );
    res.json({ message: "User Verified", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/verify-user/:targetUserId", authMiddleware, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.targetUserId,
      { isVerified: true },
      { new: true },
    );

    await Notification.create({
      recipient: updatedUser._id,
      title: "Account Verified! ✅",
      description:
        "Welcome to the elite club! Your student status is verified. Enjoy premium discounts.",
      type: "System",
      icon: "sparkles",
    });

    res.json({ message: "User verified and notified." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------- GET LOGGED-IN USER PROFILE (Dynamic) ----------------
router.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("university");

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.referralCode && user.role === "student") {
      await user.save();
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE THIS ROUTE IN YOUR BACKEND ---
// POST: Apply for exchange
router.post('/exchange/apply', authMiddleware, async (req, res) => {
  try {
    const { programId, formData, experiences } = req.body;

    // 1. Check if user already applied (Prevention)
    const existingApp = await Application.findOne({ 
      programId, 
      userId: req.userId 
    });

    if (existingApp) {
      return res.status(400).json({ message: "You have already applied for this program." });
    }

    // 2. Create Application
    const newApp = new Application({
      programId,
      userId: req.userId, // Decoded from JWT by authMiddleware
      formData,
      experiences,
    });

    await newApp.save();

    // 3. Optional: Notify Admin or User
    await Notification.create({
      recipient: req.userId,
      title: "Application Received",
      description: "We've received your exchange application and are reviewing it!",
      type: "System",
      icon: "clipboard-check"
    });

    res.status(201).json({ success: true, message: "Application Submitted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 1. PUBLIC PACKAGES ROUTE (Place this ABOVE /:id)
// URL: GET /api/auth/packages/public
router.get('/packages/public', async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------- DYNAMIC ROUTES (MUST BE LAST) --------------------

// ✅ 2. GET USER BY ID (With ObjectId Validation)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // PERFECT FIX: If the ID is not a valid MongoDB Hex string (like "packages"), 
    // this will stop the CastError before it even hits the database.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "Invalid User ID format or route not found." 
      });
    }

    const user = await User.findById(id)
      .select("-password")
      .populate("university");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
