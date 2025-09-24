// const Razorpay = require("razorpay");
// const crypto = require("crypto");
// const Application = require("../models/Application");

// // ✅ Razorpay instance तयार करा
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // ------------------
// // 📌 Create Razorpay Order
// // ------------------
// const createOrder = async (req, res) => {
//   try {
//     const { amount, applicationId } = req.body;

//     if (!amount || !applicationId) {
//       return res.status(400).json({ message: "Amount and Application ID required" });
//     }

//     // Razorpay साठी order तयार करा
//     const options = {
//       amount: amount * 100, // convert to paise
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     };

//     const order = await razorpay.orders.create(options);

//     // Application मध्ये Draft + Pending Payment save करा
//     await Application.findByIdAndUpdate(applicationId, {
//       "paymentInfo.orderId": order.id,
//       "paymentInfo.amount": amount,
//       "paymentInfo.status": "Pending",
//     });

//     res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
//   } catch (err) {
//     console.error("Create order error:", err);
//     res.status(500).json({ message: "Failed to create order" });
//   }
// };

// // ------------------
// // 📌 Verify Razorpay Payment
// // ------------------
// const verifyPayment = async (req, res) => {
//   try {
//     const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } =
//       req.body;

//     if (!applicationId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//       return res.status(400).json({ message: "Missing payment verification details" });
//     }

//     // Signature verify करा
//     const sign = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(razorpay_order_id + "|" + razorpay_payment_id)
//       .digest("hex");

//     if (sign !== razorpay_signature) {
//       // ❌ Invalid payment → Failed mark करा
//       await Application.findByIdAndUpdate(applicationId, {
//         "paymentInfo.status": "Failed",
//       });
//       return res.status(400).json({ message: "Payment verification failed" });
//     }

//     // ✅ Payment verified → Application Submitted
//     const updatedApp = await Application.findByIdAndUpdate(
//       applicationId,
//       {
//         status: "Submitted",
//         paymentInfo: {
//           orderId: razorpay_order_id,
//           paymentId: razorpay_payment_id,
//           signature: razorpay_signature,
//           amount,
//           status: "Paid",
//         },
//       },
//       { new: true }
//     )
//       .populate("user", "name mobile")
//       .populate("service", "name");

//     // जर socket.io वापरत असशील तर
//     req.io?.emit("applicationCreated", updatedApp);

//     res.json({ message: "Payment successful", application: updatedApp });
//   } catch (err) {
//     console.error("Verify payment error:", err);
//     res.status(500).json({ message: "Payment verification failed" });
//   }
// };

// module.exports = { createOrder, verifyPayment };
