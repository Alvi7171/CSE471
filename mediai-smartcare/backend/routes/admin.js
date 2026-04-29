const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const inventoryController = require("../controllers/inventoryController");
const bedAllocationController = require("../controllers/bedAllocationController");

router.use(requireAuth, requireRole("admin"));

router.get("/dashboard", async (req, res) => {
  return res.json({
    success: true,
    message: "Admin dashboard endpoint ready for future tasks",
    todo: [
      "User management",
      "Doctor onboarding",
      "Analytics and reporting",
      "Appointment moderation",
    ],
  });
});

router.get("/inventory/summary", inventoryController.getSummary);
router.get("/inventory/alerts", inventoryController.getAlerts);
router.get("/inventory/medicines", inventoryController.listMedicines);
router.post("/inventory/medicines", inventoryController.createMedicine);
router.put(
  "/inventory/medicines/:medicineId",
  inventoryController.updateMedicine,
);
router.put(
  "/inventory/medicines/:medicineId/stock",
  inventoryController.adjustStock,
);
router.delete(
  "/inventory/medicines/:medicineId",
  inventoryController.deleteMedicine,
);

router.get("/beds/summary", bedAllocationController.getBedSummary);
router.get("/beds", bedAllocationController.listBeds);
router.post("/beds/suggest", bedAllocationController.suggestBed);
router.post("/beds/allocate", bedAllocationController.allocateBed);
router.put(
  "/beds/allocations/:allocationId/release",
  bedAllocationController.releaseAllocation,
);

module.exports = router;
