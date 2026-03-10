// router.put("/update-profile", authMiddleware, upload.fields([
//   { name: 'profileImage', maxCount: 1 },
//   { name: 'idCardFront', maxCount: 1 },
//   { name: 'idCardBack', maxCount: 1 },
//   { name: 'livePicture', maxCount: 1 }
// ]), async (req, res) => {
//   try {
//     const { name, phone, email } = req.body;
//     const updateData = { name, phone, email, status: "Verified" };

//     if (req.files) {
//       // Store the relative path: "uploads/filename.jpg"
//       if (req.files.profileImage) updateData.profileImage = req.files.profileImage[0].path;
//       if (req.files.idCardFront) updateData.idCardFront = req.files.idCardFront[0].path;
//       if (req.files.idCardBack) updateData.idCardBack = req.files.idCardBack[0].path;
//       if (req.files.livePicture) updateData.livePicture = req.files.livePicture[0].path;
//     }

//     const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, { new: true }).populate("university");
//     res.json(updatedUser);
//   } catch (err) {
//     res.status(500).json({ error: "Update failed" });
//   }
// });