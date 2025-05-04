const Lease = require("../models/Lease");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const Unit = require("../models/Unit");
const Property = require("../models/Property");

const createLease = async (req, res) => {
  try {
    const {
      unitId,
      ownerId,
      tenantEmail,
      startDate,
      endDate,
      rentAmount,
      chargesAmount,
      deposit,
      paymentDate,
    } = req.body;

    if (
      !unitId ||
      !tenantEmail ||
      !startDate ||
      !rentAmount ||
      !chargesAmount
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find user by his email
    const user = await User.findOne({ email: tenantEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found !" });
    }

    // Find the tenant with his userId
    const tenant = await Tenant.findOne({ userId: user._id });
    if (!tenant) {
      return res.status(404).json({
        message: "No Tenant profile  linked to a User.",
      });
    }

    // Create the lease
    const lease = new Lease({
      unitId,
      ownerId,
      tenantId: tenant._id,
      startDate,
      endDate,
      rentAmount,
      chargesAmount,
      deposit,
      paymentDate,
    });

    await lease.save();

    res.status(201).json(lease);
  } catch (error) {
    console.error("Lease creation error :", error.message);
    res.status(500).json({ message: "Server error during lease creation" });
  }
};

// Get leases by owner
const getLeasesByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;

    // Get leases from an owner and others infos (from tenant and unit)
    const leases = await Lease.find({ ownerId })
      .populate({
        path: "unitId",
        populate: {
          path: "propertyId",
          model: "Property",
          select: "address city postalCode",
        },
      })
      .populate({
        path: "tenantId",
        populate: {
          path: "userId",
          model: "User",
          select: "email profile.username profile.firstName profile.lastName",
        },
      });

    // Then create a new object "lease" to include property infos
    const leasesWithProperty = await Promise.all(
      leases.map(async (lease) => {
        const unit = lease.unitId;
        const property = await Property.findById(unit?.propertyId);

        return {
          ...lease.toObject(),
          property: property || null,
        };
      })
    );

    res.status(200).json(leasesWithProperty);
  } catch (error) {
    console.error("Error fetching leases :", error.message);
    res.status(500).json({ message: "Server error during leases fetching." });
  }
};

module.exports = {
  createLease,
  getLeasesByOwner,
};
