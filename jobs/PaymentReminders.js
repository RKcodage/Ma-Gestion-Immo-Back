const cron = require("node-cron");
const Lease = require("../models/Lease");
const Notification = require("../models/Notification");

// Scheduled task at 8 A.M
cron.schedule("0 8 * * *", async () => {
  console.log("[CRON] Vérification des paiements à venir...");

  const today = new Date();
  const currentDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const oneWeekLater = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7
  );

  try {
    const leases = await Lease.find({})
      .populate({
        path: "unitId",
        populate: { path: "propertyId", select: "address city" },
      })
      .populate({
        path: "tenantId",
        populate: { path: "userId", select: "profile" },
      });

    for (const lease of leases) {
      if (
        !lease.paymentDate ||
        !lease.startDate ||
        !lease.endDate ||
        !lease.tenantId ||
        !lease.tenantId.userId ||
        !lease.unitId?.propertyId
      )
        continue;

      const start = new Date(lease.startDate);
      const end = new Date(lease.endDate);
      if (currentDate < start || currentDate > end) continue;

      // Calculate date of the next payment
      let nextPaymentDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        lease.paymentDate
      );
      if (nextPaymentDate < currentDate) {
        nextPaymentDate = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          lease.paymentDate
        );
      }

      if (nextPaymentDate.toDateString() === oneWeekLater.toDateString()) {
        // Create a notification for the tenant
        await Notification.create({
          userId: lease.tenantId.userId._id,
          message: `⚠️ Le loyer de votre logement situé au ${
            lease.unitId.propertyId.address
          } est dû le ${lease.paymentDate} ${nextPaymentDate.toLocaleString(
            "fr-FR",
            { month: "long" }
          )}.`,
          link: "/dashboard/leases",
        });

        console.log(
          `Notification créée pour le locataire ${lease.tenantId.userId.profile?.firstName}`
        );
      }
    }
  } catch (err) {
    console.error("[CRON] Erreur dans PaymentReminders:", err.message);
  }
});
