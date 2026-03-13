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
    unique: true 
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


// Logic to generate a truly unique 6-character code
userSchema.pre('save', async function(next) {
  // Only generate for students who don't have one yet
  if (!this.referralCode && this.role === 'student') {
    let isUnique = false;
    let newCode = "";
    
    while (!isUnique) {
      // Generates a random 6-character alphanumeric string
      newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Verify uniqueness in the DB
      const existing = await mongoose.models.User.findOne({ referralCode: newCode });
      if (!existing) isUnique = true;
    }
    
    this.referralCode = newCode;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);