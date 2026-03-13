const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  name: { 
    type: String, 
    required: true 
  },

  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  password: { 
    type: String, 
    required: true 
  },

  role: {
    type: String,
    enum: ["student", "brand", "admin"],
    default: "student"
  },

  isAlumni: { 
    type: Boolean, 
    default: false 
  },

  isVip: { 
    type: Boolean, 
    default: false 
  },

  vipExpiry: { 
    type: Date 
  },

  status: {
    type: String,
    enum: ["Not Verified", "Pending", "Verified"],
    default: "Not Verified"
  },

  profileImage: { 
    type: String, 
    default: "" 
  },

  idCardFront: { 
    type: String, 
    default: "" 
  },

  idCardBack: { 
    type: String, 
    default: "" 
  },

  livePicture: { 
    type: String, 
    default: "" 
  },

  rollNo: String,
  phone: String,

  university: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "University" 
  },

  address: String,
  instagram: String,

  // Referral System
  referralCode: { 
    type: String, 
    unique: true,
    sparse: true
  }, 

  referredBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },

  referralCount: { 
    type: Number, 
    default: 0 
  },

  canApplyForTdcCard: { 
    type: Boolean, 
    default: false 
  }

}, 
{ timestamps: true }
);


userSchema.pre('save', async function () {
  if (this.role === 'student' && !this.referralCode) {

    let isUnique = false;
    let newCode = "";
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      attempts++;

      newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const existing = await this.constructor.findOne({ referralCode: newCode });

      if (!existing) {
        isUnique = true;
      }
    }

    if (isUnique) {
      this.referralCode = newCode;
    } else {
      throw new Error("Failed to generate unique referral code");
    }
  }
});

module.exports = mongoose.model("User", userSchema);