const Unit = require("../models/Unit");
const Lease = require("../models/Lease");

// Create a unit for a property
const createUnit = async (req, res) => {
  try {
    const {
      propertyId,
      label,
      type,
      floor,
      surface,
      rentAmount,
      chargesAmount,
      description,
    } = req.body;

    if (!propertyId || !label || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const unit = new Unit({
      propertyId,
      label,
      type,
      floor,
      surface,
      rentAmount,
      chargesAmount,
      description,
    });

    await unit.save();

    res.status(201).json(unit);
  } catch (error) {
    console.error("createUnit error:", error.message);
    res.status(500).json({ error: "Error during unit creation" });
  }
};

// Get all units by property Id
const getUnitsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const units = await Unit.find({ propertyId });

    const results = await Promise.all(
      units.map(async (unit) => {
        const leaseCount = await Lease.countDocuments({ unitId: unit._id });
        return {
          ...unit.toObject(),
          leaseCount,
        };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error("getUnitsByProperty error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update a unit
const updateUnitById = async (req, res) => {
  try {
    const { unitId } = req.params;
    const updatedData = req.body;

    const unit = await Unit.findByIdAndUpdate(unitId, updatedData, {
      new: true,
    });

    if (!unit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    res.status(200).json(unit);
  } catch (error) {
    console.error("updateUnitById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Delete a unit
const deleteUnitById = async (req, res) => {
  try {
    const { unitId } = req.params;

    const deletedUnit = await Unit.findByIdAndDelete(unitId);

    if (!deletedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    res.status(200).json({ message: "Unit deleted successfully" });
  } catch (error) {
    console.error("deleteUnitById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createUnit,
  getUnitsByProperty,
  updateUnitById,
  deleteUnitById,
};
