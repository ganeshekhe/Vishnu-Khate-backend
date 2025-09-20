


const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const { verifyToken } = require("../middleware/authMiddleware");

// 🔹 Get all services with subservices & fees
router.get("/", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load services" });
  }
});

// 🔹 Add new service (Admin Only)
router.post("/", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  try {
    const { name, fees, platformFee, subservices } = req.body;

    const existingService = await Service.findOne({ name });
    if (existingService) {
      return res.status(400).json({ message: "Service already exists" });
    }

    const newService = new Service({ name, fees, platformFee, subservices });
    await newService.save();

    res.json({ message: "Service added", service: newService });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add service" });
  }
});

// 🔹 Update service / platformFee / subservices (Admin Only)
router.put("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  try {
    const updatedService = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedService) return res.status(404).json({ message: "Service not found" });

    res.json({ message: "Service updated", service: updatedService });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update service" });
  }
});

// 🔹 Delete service (Admin Only)
router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

  try {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Service not found" });

    res.json({ message: "Service deleted", service: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete service" });
  }
});

module.exports = router;
