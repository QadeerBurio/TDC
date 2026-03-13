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

const path = require("path");
const router = express.Router();


// ---------------- MULTER STORAGE ----------------

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/");
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = Date.now() + "-" + file.originalname;
//     cb(null, uniqueName);
//   }
// });

// const upload = multer({ storage });

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

// -------------------- SIGNUP --------------------
// Backend /routes/auth.js
// router.post("/signup", async (req, res) => {
//   try {

//     const {
//       role,
//       email,
//       password,
//       fullName,
//       brandName,
//       rollNo,
//       phone,
//       universityName,
//       address,
//       instagram
//     } = req.body;

//     const existingEmail = await User.findOne({ email });
//     if (existingEmail)
//       return res.status(400).json({ error: "Email already used" });

//     const hashedPassword = await bcrypt.hash(password, 10);

//     let universityId = null;
//     let name = "";

//     if (role === "student") {

//       if (!fullName || !universityName)
//         return res.status(400).json({ error: "Full name and university required" });

//       name = fullName;

//       let uni = await University.findOne({ name: universityName });
//       if (!uni) uni = await University.create({ name: universityName });

//       universityId = uni._id;
    
//     }

//     else if (role === "brand") {

//       if (!brandName)
//         return res.status(400).json({ error: "Brand name required" });

//       name = brandName;
//     }

//     else if (role === "admin") {

//       name = fullName || "Admin";
//     }

//     const user = await User.create({

//       name,
//       email,
//       password: hashedPassword,
//       role,
//       rollNo,
//       phone,
//       university: universityId,
//       address,
//       instagram,
//       status: role === "admin" ? "Verified" : "Not Verified"

//     });

//     res.json({
//       message: "Signup successful",
//       user
//     });

//   } catch (err) {

//     res.status(500).json({ error: err.message });

//   }
// });

// -------------------- SIGNUP --------------------
// router.post("/signup", async (req, res) => {
//   try {
//     const {
//       role, email, password, fullName, brandName,
//       rollNo, isAlumni, phone, universityName, address, instagram
//     } = req.body;

//     const existingEmail = await User.findOne({ email });
//     if (existingEmail) return res.status(400).json({ error: "Email already used" });

//     const hashedPassword = await bcrypt.hash(password, 10);

//     let universityId = null;
//     let name = "";

//     // Role Logic
//     if (role === "student") {
//       if (!fullName || !universityName) return res.status(400).json({ error: "Name and university required" });
//       name = fullName;
//       let uni = await University.findOne({ name: universityName });
//       if (!uni) uni = await University.create({ name: universityName });
//       universityId = uni._id;
//     } else if (role === "brand") {
//       if (!brandName) return res.status(400).json({ error: "Brand name required" });
//       name = brandName;
//     } else {
//       name = fullName || "Admin";
//     }

    
//     const user = await User.create({
//       name, email, password: hashedPassword, role, isAlumni: !!isAlumni,
//       rollNo, phone, university: universityId, address,
//       instagram, status: role === "admin" ? "Verified" : "Not Verified"
//     });

//     // --- NOTIFICATION LOGIC FOR STUDENTS ONLY ---
//     if (role === "student") {
//       try {
//         await Notification.create({
//           recipient: user._id,
//           title: "Welcome to the Crew! 🚀",
//           description: `Hey ${name}! Your student account is ready. Explore exclusive deals in Karachi.`,
//           type: "System",
//           icon: "party-popper",
//           readBy: [] // Unread by default
//         });

//         // Send Welcome Email
//         transporter.sendMail({
//           from: `"The Deft Crew" <${process.env.EMAIL_USER}>`,
//           to: email,
//           subject: "Welcome to the Crew! 🚀",
//           html: `<p>Welcome <b>${name}</b>! Your account is now active.</p>`
//         }).catch(err => console.log("Mail Error:", err.message));

//       } catch (nError) {
//         console.error("Welcome Notification Error:", nError.message);
//       }
//     }

//     res.json({ message: "Signup successful", user });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
router.post("/signup", async (req, res) => {
  try {
    const {
      role, email, password, fullName, brandName,
      rollNo, isAlumni, phone, universityName, address, instagram,
      referralCodeInput 
    } = req.body;

    // 1. Check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: "Email already used" });

    const hashedPassword = await bcrypt.hash(password, 10);

    let universityId = null;
    let name = "";

    // 2. Role Logic
    if (role === "student") {
      if (!fullName || !universityName) return res.status(400).json({ error: "Name and university required" });
      name = fullName;
      let uni = await University.findOne({ name: universityName });
      if (!uni) uni = await University.create({ name: universityName });
      universityId = uni._id;
    } else if (role === "brand") {
      if (!brandName) return res.status(400).json({ error: "Brand name required" });
      name = brandName;
    } else {
      name = fullName || "Admin";
    }

    // 3. Handle Referrer lookup (One time only)
    let referrer = null;
    if (referralCodeInput) {
      // Normalize to uppercase to match generated codes
      referrer = await User.findOne({ referralCode: referralCodeInput.toUpperCase() });
    }

    // 4. Create the User (Only ONCE)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isAlumni: !!isAlumni,
      rollNo,
      phone,
      university: universityId,
      address,
      instagram,
      status: role === "admin" ? "Verified" : "Not Verified",
      referredBy: referrer ? referrer._id : null,
    });

    // 5. Update Referrer Stats (One time only, using $inc for safety)
    if (referrer) {
      const updatedReferrer = await User.findByIdAndUpdate(
        referrer._id,
        { $inc: { referralCount: 1 } },
        { new: true }
      );

      // Check if they hit the 10-referral milestone
      if (updatedReferrer.referralCount >= 10 && !updatedReferrer.canApplyForTdcCard) {
        updatedReferrer.canApplyForTdcCard = true;
        await updatedReferrer.save();
      }
    }

    // 6. Notification Logic for Students
    if (role === "student") {
      try {
        await Notification.create({
          recipient: user._id,
          title: "Welcome to the Crew! 🚀",
          description: `Hey ${name}! Your student account is ready. Explore exclusive deals.`,
          type: "System",
          icon: "party-popper",
          readBy: []
        });

        transporter.sendMail({
          from: `"The Deft Crew" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Welcome to the Crew! 🚀",
          html: `<p>Welcome <b>${name}</b>! Your account is now active.</p>`
        }).catch(err => console.log("Mail Error:", err.message));

      } catch (nError) {
        console.error("Notification/Email Error:", nError.message);
      }
    }

    res.json({ message: "Signup successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

    if (!user)
      return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});

// -------------------- FORGOT PASSWORD (SEND OTP) --------------------
router.post("/forgot-password", async (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone) return res.status(400).json({ message: "Email or phone required" });

  try {
    const user = await User.findOne({ $or: [{ email: emailOrPhone }, { phone: emailOrPhone }] });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[user._id] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 minutes expiry

    await transporter.sendMail({
      from: `"E-Gift App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "OTP for Password Reset",
      html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
    });

    res.json({ message: "OTP sent successfully", userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- VERIFY OTP --------------------
router.post("/verify-otp", async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) return res.status(400).json({ message: "userId and OTP required" });

  const record = otpStore[userId];
  if (!record) return res.status(400).json({ message: "No OTP sent" });
  if (record.expires < Date.now()) return res.status(400).json({ message: "OTP expired" });
  if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

  // Generate temporary JWT for password reset (valid for 10 min)
  const tempToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "10m" });

  res.json({ message: "OTP verified", resetToken: tempToken });
});

// -------------------- RESET PASSWORD --------------------
router.post("/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ message: "Token and new password required" });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });
    delete otpStore[decoded.id]; // remove OTP

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
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

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// 2. Update Profile Route

// router.put(
//   "/update-profile",
//   authMiddleware,
//   upload.single("profileImage"), // This MUST match the string in formData.append
//   async (req, res) => {
//     try {
//       const { name, phone, email } = req.body;
//       let updateData = { name, phone, email };

//       if (req.file) {
//         updateData.profileImage = req.file.path; // Cloudinary URL
//       }

//       const updatedUser = await User.findByIdAndUpdate(
//         req.userId,
//         { $set: updateData },
//         { new: true }
//       ).populate("university");

//       res.status(200).json({ user: updatedUser });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ error: "Server failed to save data" });
//     }
//   }
// );


// ADMIN ONLY: APPROVE USER
router.post("/approve-user/:id", authMiddleware, async (req, res) => {
  // Add logic here to check if req.userId is an admin
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: "Verified" }, { new: true });
    res.json({ message: "User Verified", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/verify-user/:targetUserId",authMiddleware, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.targetUserId, { isVerified: true }, { new: true });

    await Notification.create({
      recipient: updatedUser._id,
      title: "Account Verified! ✅",
      description: "Welcome to the elite club! Your student status is verified. Enjoy premium discounts.",
      type: "System",
      icon: "sparkles",
    });

    res.json({ message: "User verified and notified." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ---------------- GET LOGGED-IN USER PROFILE (Dynamic) ----------------
router.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    // req.userId comes from the authMiddleware after verifying the JWT
    const user = await User.findById(req.userId)
      .select("referralCount referralCode canApplyForTdcCard")
      .populate("university");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
