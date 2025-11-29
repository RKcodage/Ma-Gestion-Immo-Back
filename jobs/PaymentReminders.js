const cron = require("node-cron");
const Lease = require("../models/Lease");
const Notification = require("../models/Notification");
const { sendMail } = require("../config/mailer");

// Skip the cron worker entirely in the test environment
if (process.env.NODE_ENV !== "test") {
  // Scheduled task at 8 A.M (server UTC)
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
          path: "tenants",
          populate: { path: "userId", select: "profile email" },
        });

      for (const lease of leases) {
        if (
          !lease.paymentDate ||
          !lease.startDate ||
          !lease.endDate ||
          !lease.unitId?.propertyId ||
          !Array.isArray(lease.tenants) ||
          lease.tenants.length === 0
        ) {
          continue;
        }

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
          // Notify and email each tenant user linked to the lease
          for (const tenant of lease.tenants) {
            const tenantUser = tenant?.userId;
            if (!tenantUser?._id) continue;

            await Notification.create({
              userId: tenantUser._id,
              message: `⚠️ Le loyer de votre logement situé au ${
                lease.unitId.propertyId.address
              } est dû le ${lease.paymentDate} ${nextPaymentDate.toLocaleString(
                "fr-FR",
                { month: "long" }
              )}.`,
              link: "/dashboard/leases",
            });

            console.log(
              `Notification créée pour le locataire ${tenantUser.profile?.firstName}`
            );

            // Send email reminder
            try {
              const to = tenantUser.email;
              if (to) {
                const subject = "Rappel de paiement du loyer";
                const html = `<p>Bonjour ${
                  tenantUser.profile?.firstName || ""
                },</p>
                         <p>Votre loyer pour le logement situé au <strong>${
                           lease.unitId.propertyId.address
                         }</strong> est dû le <strong>${lease.paymentDate} ${nextPaymentDate.toLocaleString(
                  "fr-FR",
                  { month: "long" }
                )}</strong>.</p>
                         <p><a href=\"https://ma-gestion-immo.netlify.app/dashboard/leases\">Voir mon bail</a></p>`;
                await sendMail({
                  from: process.env.MAIL_USER,
                  to,
                  subject,
                  html,
                });
              }
            } catch (mailErr) {
              console.warn(
                "[CRON] Envoi email rappel loyer échoué:",
                mailErr.message
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("[CRON] Erreur dans PaymentReminders:", err.message);
    }
  });
}
