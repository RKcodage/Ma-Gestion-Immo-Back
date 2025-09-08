const Lease = require("../models/Lease");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const Owner = require("../models/Owner");
const Unit = require("../models/Unit");
const Property = require("../models/Property");
const Notification = require("../models/Notification");
const Invitation = require("../models/Invitation");
const uid2 = require("uid2");
const nodemailer = require("nodemailer");

// Mail service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Create Lease
const createLease = async (req, res) => {
  try {
    // Get owner linked to a connected user
    const owner = await Owner.findOne({ userId: req.user._id }).select("_id");
    if (!owner) {
      return res.status(403).json({ message: "Owner not found for this user" });
    }

    const {
      unitId,
      /* ownerId */ // ignore value from client
      tenantEmails,
      startDate,
      endDate,
      rentAmount,
      chargesAmount,
      deposit,
      paymentDate,
    } = req.body;

    if (
      !unitId ||
      !tenantEmails ||
      !Array.isArray(tenantEmails) ||
      tenantEmails.length === 0 ||
      !startDate ||
      !rentAmount ||
      !chargesAmount ||
      !paymentDate
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const tenantIds = [];
    const pendingInvitations = [];

    for (const email of tenantEmails) {
      const user = await User.findOne({ email });
      if (!user) {
        const invitationToken = uid2(32);
        pendingInvitations.push({ email, token: invitationToken });
      } else {
        const tenant = await Tenant.findOne({ userId: user._id });
        if (!tenant) continue;
        tenantIds.push(tenant._id);
      }
    }

    // Create lease by imposing ownerId from req.user
    const lease = await Lease.create({
      unitId,
      ownerId: owner._id,
      tenants: tenantIds,
      startDate,
      endDate,
      rentAmount,
      chargesAmount,
      deposit,
      paymentDate,
      isShared: tenantEmails.length > 1,
    });

    // Create invitations with known leaseId
    await Promise.all(
      pendingInvitations.map(async ({ email, token }) => {
        await Invitation.create({
          email,
          leaseId: lease._id,
          token,
          expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        });

        await transporter.sendMail({
          from: "rkabra.dev@gmail.com",
          to: email,
          subject: "Invitation à rejoindre Ma Gestion Immo",
          html: `<p>Bonjour,</p>
            <p>Vous avez été invité à rejoindre Ma Gestion Immo. Cliquez sur le lien ci-dessous pour créer votre compte et accéder à votre bail :</p>
            <a href="https://ma-gestion-immo.netlify.app/invitation/${token}">Créer mon compte</a>
            <p>Ce lien est valide pendant 48 heures.</p>`,
        });
      })
    );

    // Notifications for tenants already registered
    await Promise.all(
      tenantIds.map(async (tenantId) => {
        const tenant = await Tenant.findById(tenantId).populate("userId");
        if (tenant?.userId) {
          await Notification.create({
            userId: tenant.userId._id,
            type: "Bail",
            title: "Nouveau bail disponible",
            message: "Votre propriétaire a ajouté un nouveau bail pour vous.",
            data: { leaseId: lease._id },
            link: `/dashboard/leases?leaseId=${lease._id}`,
          });
        }
      })
    );

    res.status(201).json({
      message: "Lease created successfully",
      leaseId: lease._id,
      invitationsSent: pendingInvitations.map((i) => i.email),
    });
  } catch (error) {
    console.error("Lease creation error:", error.message);
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
        path: "tenants",
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
          path: "tenants",
          populate: {
            path: "userId",
            model: "User",
            select: "email profile.firstName profile.lastName",
          },
        });
    } else if (role === "Locataire") {
      const tenant = await Tenant.findOne({ userId });
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      leases = await Lease.find({ tenants: tenant._id })
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
        })
        .populate({
          path: "tenants",
          populate: {
            path: "userId",
            model: "User",
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

    // Owner from connected user
    const owner = await Owner.findOne({ userId: req.user._id }).select("_id");
    if (!owner)
      return res.status(403).json({ message: "Action non autorisée" });

    // Verify if user is lease owner
    const lease = await Lease.findById(leaseId).select("ownerId");
    if (!lease) return res.status(404).json({ message: "Lease not found" });

    if (String(lease.ownerId) !== String(owner._id)) {
      return res
        .status(403)
        .json({ message: "You're not the owner of this lease" });
    }

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

    // Owner from connected user
    const owner = await Owner.findOne({ userId: req.user._id }).select("_id");
    if (!owner) return res.status(403).json({ message: "Action not allowed" });

    // Verify if user is lease owner
    const lease = await Lease.findById(leaseId).select("ownerId");
    if (!lease) return res.status(404).json({ message: "Lease not found" });

    if (String(lease.ownerId) !== String(owner._id)) {
      return res
        .status(403)
        .json({ message: "You're not the owner of this lease" });
    }

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
    const userId = req.user._id;
    const role = req.user.role;

    const today = new Date();
    const currentDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    let leases = [];

    if (role === "Propriétaire") {
      const owner = await Owner.findOne({ userId });
      if (!owner) return res.status(404).json({ message: "Owner not found" });

      leases = await Lease.find({ ownerId: owner._id });
    } else if (role === "Locataire") {
      const tenant = await Tenant.findOne({ userId });
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      leases = await Lease.find({ tenants: tenant._id });
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    leases = await Lease.populate(leases, [
      {
        path: "unitId",
        populate: { path: "propertyId", select: "address city postalCode" },
      },
      {
        path: "tenants",
        populate: { path: "userId", select: "profile" },
      },
    ]);

    const upcoming = leases
      .map((lease) => {
        if (
          !lease.paymentDate ||
          !lease.startDate ||
          !lease.endDate ||
          !lease.unitId?.propertyId
        )
          return null;

        const start = new Date(lease.startDate);
        const end = new Date(lease.endDate);

        let paymentMonth = currentDate.getMonth();
        let paymentYear = currentDate.getFullYear();

        let nextPayment = new Date(
          paymentYear,
          paymentMonth,
          lease.paymentDate
        );
        if (nextPayment < currentDate) {
          nextPayment = new Date(
            paymentYear,
            paymentMonth + 1,
            lease.paymentDate
          );
        }

        if (nextPayment < start || nextPayment > end) return null;

        return {
          _id: lease._id,
          nextPaymentDate: nextPayment,
          propertyAddress: lease.unitId.propertyId.address,
          unitLabel: lease.unitId.label,
          tenants: lease.tenants.map((t) => t.userId?.profile).filter(Boolean),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.nextPaymentDate - b.nextPaymentDate)
      .slice(0, 3);

    res.status(200).json(upcoming);
  } catch (err) {
    console.error("getUpcomingPayments:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Get payments historic
const getPaymentsHistoric = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    const today = new Date();
    const currentDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    let leases = [];

    if (role === "Propriétaire") {
      const owner = await Owner.findOne({ userId });
      if (!owner) return res.status(404).json({ message: "Owner not found" });

      leases = await Lease.find({ ownerId: owner._id });
    } else if (role === "Locataire") {
      const tenant = await Tenant.findOne({ userId });
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      leases = await Lease.find({ tenants: tenant._id });
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    leases = await Lease.populate(leases, [
      {
        path: "unitId",
        populate: { path: "propertyId", select: "address city postalCode" },
      },
      {
        path: "tenants",
        populate: { path: "userId", select: "profile" },
      },
    ]);

    const history = leases
      .map((lease) => {
        if (
          !lease.paymentDate ||
          !lease.startDate ||
          !lease.endDate ||
          !lease.unitId?.propertyId
        )
          return null;

        const start = new Date(lease.startDate);
        const end = new Date(lease.endDate);

        let paymentMonth = currentDate.getMonth();
        let paymentYear = currentDate.getFullYear();

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
          tenants: lease.tenants.map((t) => t.userId?.profile).filter(Boolean),
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
