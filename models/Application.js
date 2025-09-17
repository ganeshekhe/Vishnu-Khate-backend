

// const mongoose = require("mongoose");

// const documentSchema = new mongoose.Schema({
//   filename: String,
//   fileId: String,
// }, { _id: false });

// const profileDocSchema = new mongoose.Schema({
//   filename: String,
//   filepath: String,
// }, { _id: false });

// const userProfileSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     default: "",
//   },
//   caste: {
//     type: String,
//     default: "",
//   },
//   gender: {
//     type: String,
//     enum: ["male", "female", "other"],
//     default: null,
//   },
//   dob: {
//     type: Date,
//     default: null,
//   },
//   profileDocs: [profileDocSchema],
// }, { _id: false });

// const applicationSchema = new mongoose.Schema({
//   // 👤 User who submitted the application
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },

//   // 👨‍💼 Operator assigned (optional)
//   operator: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//   },

//   // 🛠️ Selected Service
//   service: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Service",
//     required: true,
//   },

//   // 📝 Basic submitted data (optional future use)
//   data: {
//     type: Object,
//     default: {},
//   },

//   // 📎 Uploaded additional documents
//   documents: [documentSchema],

//   // 📋 User profile snapshot at submission
//   userProfile: userProfileSchema,

//   // 🔄 Status of application
//   status: {
//     type: String,
//     enum: [
//       "Pending",
//       "Submitted",
//       "In Review",
//       "Pending Confirmation",
//       "Confirmed",
//       "Rejected",
//       "Completed",
//     ],
//     default: "Submitted",
//   },

  
//   formPdf: {
//   filename: String,
//   fileId: mongoose.Schema.Types.ObjectId,
// },
// certificate: {
//   filename: String,
//   fileId: mongoose.Schema.Types.ObjectId,
// },


//   // ❌ Operator rejection reason
//   rejectReason: {
//     type: String,
//     default: "",
//   },

//   // 🔁 User correction feedback
//   correctionComment: {
//     type: String,
//     default: "",
//   },
// }, { timestamps: true });

// module.exports = mongoose.model("Application", applicationSchema);


// const mongoose = require("mongoose");

// const ApplicationSchema = new mongoose.Schema(
//   {
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
//     subService: { _id: String, name: String },
//     data: { type: Object, default: {} },
//     documents: [{ filename: String, fileId: mongoose.Schema.Types.ObjectId }],
//     userProfile: {
//       name: String,
//       caste: String,
//       gender: String,
//       dob: Date,
//       profileDocs: [{ filename: String, fileId: mongoose.Schema.Types.ObjectId, filepath: String }],
//     },
//     status: {
//       type: String,
//       enum: ["Submitted", "In Review", "Pending Confirmation", "Confirmed", "Rejected", "Completed"],
//       default: "Submitted",
//     },
//     formPdf: {
//       filename: String,
//       fileId: mongoose.Schema.Types.ObjectId,
//     },
//     certificate: {
//       filename: String,
//       fileId: mongoose.Schema.Types.ObjectId,
//     },
//     // ✅ Add operator credentials
//     operatorCredentials: {
//       operatorId: { type: String, default: "" },
//       operatorPassword: { type: String, default: "" },
//     },
//     rejectReason: { type: String, default: "" },
//     correctionComment: { type: String, default: "" },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Application", ApplicationSchema);
// const mongoose = require("mongoose");

// const ApplicationSchema = new mongoose.Schema(
//   {
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
//     subService: { _id: String, name: String },
//     data: { type: Object, default: {} },
//     documents: [{ filename: String, fileId: mongoose.Schema.Types.ObjectId }],
//     userProfile: {
//       name: String,
//       caste: String,
//       gender: String,
//       dob: Date,
//       profileDocs: [{ filename: String, fileId: mongoose.Schema.Types.ObjectId, filepath: String }],
//     },
//     status: {
//       type: String,
//       enum: [
//         "Draft",
//         "Submitted",
//         "In Review",
//         "Pending Confirmation",
//         "Confirmed",
//         "Rejected",
//         "Completed",
//         "Pending",

//       ],
//       default: "Draft",
//     },
//     formPdf: {
//       filename: String,
//       fileId: mongoose.Schema.Types.ObjectId,
//     },
//     certificate: {
//       filename: String,
//       fileId: mongoose.Schema.Types.ObjectId,
//     },
//     // ✅ Add operator credentials
//     operatorCredentials: {
//       operatorId: { type: String, default: "" },
//       operatorPassword: { type: String, default: "" },
//     },
//     rejectReason: { type: String, default: "" },
//     correctionComment: { type: String, default: "" },

//     // ✅ Razorpay Payment Info
//     paymentInfo: {
//       orderId: { type: String, default: "" },
//       paymentId: { type: String, default: "" },
//       signature: { type: String, default: "" },
//       amount: { type: Number, default: 0 },
//       // status: {
//       //   type: String,
//       //   enum: ["Pending", "Paid", "Failed"],
//       //   default: "Pending",
//       // },
//      status: {
//   type: String,
//   enum: [
//     "Draft",              // 👈 हा add कर
//     "Submitted",
//     "In Review",
//     "Pending Confirmation",
//     "Confirmed",
//     "Rejected",
//     "Completed",
//   ],
//   default: "Draft",       // 👈 default Draft ठेव
// },


//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Application", ApplicationSchema);


const ApplicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    subService: { _id: String, name: String },
    data: { type: Object, default: {} },
    documents: [{ filename: String, fileId: mongoose.Schema.Types.ObjectId }],
    userProfile: {
      name: String,
      caste: String,
      gender: String,
      dob: Date,
      profileDocs: [
        { filename: String, fileId: mongoose.Schema.Types.ObjectId, filepath: String },
      ],
    },

    // ✅ Application status
    status: {
      type: String,
      enum: [
        "Draft",
        "Submitted",
        "In Review",
        "Pending Confirmation",
        "Confirmed",
        "Rejected",
        "Completed",
      ],
      default: "Draft",
    },

    formPdf: {
      filename: String,
      fileId: mongoose.Schema.Types.ObjectId,
    },
    certificate: {
      filename: String,
      fileId: mongoose.Schema.Types.ObjectId,
    },

    operatorCredentials: {
      operatorId: { type: String, default: "" },
      operatorPassword: { type: String, default: "" },
    },

    rejectReason: { type: String, default: "" },
    correctionComment: { type: String, default: "" },

    // ✅ Razorpay Payment Info
    paymentInfo: {
      orderId: { type: String, default: "" },
      paymentId: { type: String, default: "" },
      signature: { type: String, default: "" },
      amount: { type: Number, default: 0 },
      paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", ApplicationSchema);
