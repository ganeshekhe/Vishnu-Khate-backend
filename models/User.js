
// const mongoose = require("mongoose");

// const documentSchema = new mongoose.Schema({
//   filename: String,
//   fileId: String,
//   uploadedAt: { type: Date, default: Date.now },
// });

// const userSchema = new mongoose.Schema(
//   {
//     name: String,
//     mobile: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     role: { type: String, default: "user" },
//     otp: String,
//     otpExpiry: Date,
//     gender: { type: String, enum: ["male", "female", "other"] },
//     dob: Date,
//     caste: { type: String, enum: ["SC", "ST", "OBC", "General", "Other"] },

//     // ✅ Profile Documents
//     aadharCard: documentSchema,
//     panCard: documentSchema,
//     tenthCertificate: documentSchema,
//     tenthMarksheet: documentSchema,
//     twelfthCertificate: documentSchema,
//     twelfthMarksheet: documentSchema,
//     graduationDegree: documentSchema,
//     domicile: documentSchema,
//     pgCertificate: documentSchema,
//     casteValidity: documentSchema,
//     otherDocument: documentSchema,
//     profilePic: documentSchema,
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("User", userSchema);



const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  filename: String,
  fileId: String,
  uploadedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    name: String,
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    otp: String,
    otpExpiry: Date,
    gender: { type: String, enum: ["male", "female", "other"] },
    dob: Date,
    caste: { type: String, enum: ["SC", "ST", "OBC", "General", "Other"] },

    // ✅ Profile Documents
    aadharCard: documentSchema,
    panCard: documentSchema,
    tenthCertificate: documentSchema,
    tenthMarksheet: documentSchema,
    twelfthCertificate: documentSchema,
    twelfthMarksheet: documentSchema,
    graduationDegree: documentSchema,
    domicile: documentSchema,
    pgCertificate: documentSchema,
    casteValidity: documentSchema,

    // ⚡ Multi-file support for otherDocument
    otherDocument: [documentSchema],

    profilePic: documentSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
