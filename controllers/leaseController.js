const Lease = require("../models/Lease");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const Owner = require("../models/Owner");
const Unit = require("../models/Unit");
const Property = require("../models/Property");
const Notification = require("../models/Notification");

// Create Lease
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
      !chargesAmount ||
      !paymentDate
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ email: tenantEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found !" });
    }

    const tenant = await Tenant.findOne({ userId: user._id });
    if (!tenant) {
      return res.status(404).json({
        message: "No Tenant profile linked to a User.",
      });
    }

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

    // Create notification for the tenant
    await Notification.create({
      userId: user._id, // tenant by his userId
      type: "Bail",
      title: "Nouveau bail disponible",
      message: "Votre propriétaire a ajouté un nouveau bail pour vous.",
      data: { leaseId: lease._id },
      link: `/dashboard/leases?leaseId=${lease._id}`,
    });

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
    res.status(500).json({ message: "Server error during leases fetching" });
  }
};

// Get leases by role
const getLeasesByRole = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let leases = [];

    if (role === "Propriétaire") {
      const owner = await Owner.findOne({ userId });
      if (!owner) return res.status(404).json({ message: "Owner not found" });

      leases = await Lease.find({ ownerId: owner._id })
        .populate({
          path: "unitId",
          populate: { path: "propertyId" },
        })
        .populate({
          path: "tenantId",
          populate: {
            path: "userId",
            model: "User",
            select: "email profile.firstName profile.lastName",
          },
        });
    } else if (role === "Locataire") {
      const tenant = await Tenant.findOne({ userId });
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      leases = await Lease.find({ tenantId: tenant._id })
        .populate({
          path: "unitId",
          populate: { path: "propertyId" },
        })
        .populate({
          path: "ownerId",
          populate: {
            path: "userId",
            select: "email profile.firstName profile.lastName",
          },
        });
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    res.status(200).json(leases);
  } catch (error) {
    console.error("getLeasesForForm error:", error.message);
    res.status(500).json({ message: "Server error while fetching leases" });
  }
};

// Update lease
const updateLease = async (req, res) => {
  try {
    const { leaseId } = req.params;
    const updateData = req.body;

    const updatedLease = await Lease.findByIdAndUpdate(leaseId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedLease) {
      return res.status(404).json({ message: "Lease not found" });
    }

    res.status(200).json(updatedLease);
  } catch (error) {
    console.error("Update error :", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete lease
const deleteLease = async (req, res) => {
  try {
    const { leaseId } = req.params;

    const deletedLease = await Lease.findByIdAndDelete(leaseId);
    if (!deletedLease) {
      return res.status(404).json({ message: "Lease not found" });
    }

    res.status(200).json({ message: "Lease successfully erased" });
  } catch (error) {
    console.error("Lease deleting error :", error.message);
    res.status(500).json({ message: "Server error while deleting lease" });
  }
};

// Get upcoming payments by lease
const getUpcomingPayments = async (req, res) => {
  try {
    const today = new Date();
    const currentDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const leases = await Lease.find({})
      .populate({
        path: "unitId",
        populate: {
          path: "propertyId",
          select: "address city postalCode",
        },
      })
      .populate({
        path: "tenantId",
        populate: {
          path: "userId",
          select: "profile",
        },
      });

    const upcoming = leases
      .map((lease) => {
        if (
          !lease.paymentDate ||
          !lease.startDate ||
          !lease.endDate ||
          !lease.unitId?.propertyId
        ) {
          return null;
        }

        const start = new Date(lease.startDate);
        const end = new Date(lease.endDate);

        // Calculate next date
        let paymentMonth = currentDate.getMonth();
        let paymentYear = currentDate.getFullYear();

        let nextPayment = new Date(
          paymentYear,
          paymentMonth,
          lease.paymentDate
        );
        if (nextPayment < currentDate) {
          // if payment date is already passed in time, take the next month
          nextPayment = new Date(
            paymentYear,
            paymentMonth + 1,
            lease.paymentDate
          );
        }

        // if next payment date is out of lease limits, simply ignore
        if (nextPayment < start || nextPayment > end) return null;

        return {
          _id: lease._id,
          nextPaymentDate: nextPayment,
          propertyAddress: lease.unitId.propertyId.address,
          unitLabel: lease.unitId.label,
          tenant: lease.tenantId?.userId?.profile ?? null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.nextPaymentDate - b.nextPaymentDate)
      .slice(0, 3); // limit to 3 items

    res.status(200).json(upcoming);
  } catch (err) {
    console.error("getUpcomingPayments:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Get payments historic
const getPaymentsHistoric = async (req, res) => {
  try {
    const today = new Date();
    const currentDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const leases = await Lease.find({})
      .populate({
        path: "unitId",
        populate: {
          path: "propertyId",
          select: "address city postalCode",
        },
      })
      .populate({
        path: "tenantId",
        populate: {
          path: "userId",
          select: "profile",
        },
      });

    const history = leases
      .map((lease) => {
        if (
          !lease.paymentDate ||
          !lease.startDate ||
          !lease.endDate ||
          !lease.unitId?.propertyId
        ) {
          return null;
        }

        const start = new Date(lease.startDate);
        const end = new Date(lease.endDate);

        let paymentMonth = currentDate.getMonth();
        let paymentYear = currentDate.getFullYear();

        // Calculate last payment date
        let lastPayment = new Date(
          paymentYear,
          paymentMonth,
          lease.paymentDate
        );
        if (lastPayment >= currentDate) {
          lastPayment = new Date(
            paymentYear,
            paymentMonth - 1,
            lease.paymentDate
          );
        }

        if (lastPayment < start || lastPayment > end) return null;

        return {
          _id: lease._id,
          lastPaymentDate: lastPayment,
          propertyAddress: lease.unitId.propertyId.address,
          unitLabel: lease.unitId.label,
          tenant: lease.tenantId?.userId?.profile ?? null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.lastPaymentDate - a.lastPaymentDate)
      .slice(0, 3);

    res.status(200).json(history);
  } catch (err) {
    console.error("getPaymentsHistoric:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createLease,
  getLeasesByOwner,
  getLeasesByRole,
  updateLease,
  deleteLease,
  getUpcomingPayments,
  getPaymentsHistoric,
};
