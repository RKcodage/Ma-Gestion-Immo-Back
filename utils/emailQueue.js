const { sendMail } = require("../config/mailer");

// Debounce windows (ms)
const MSG_WINDOW = Number(process.env.MSG_EMAIL_DEBOUNCE_MS);
const DOC_WINDOW = Number(process.env.DOC_EMAIL_DEBOUNCE_MS);

// In-memory queues
const messageQueues = new Map(); // key: recipientId:senderId -> { messages: [{content, at}], senderName, recipient }
const documentQueues = new Map(); // key: recipientId -> { items: [{ name, type, by }], timer }

function safeName(user) {
  return (
    user?.profile?.firstName ||
    user?.profile?.username ||
    user?.email ||
    "Un utilisateur"
  );
}

// Queue a message email; groups by (recipient, sender)
function queueMessageEmail(recipientUser, senderUser, message) {
  const to = recipientUser?.email;
  if (!to) return; // no email available
  const recipientId = recipientUser._id.toString();
  const senderId = senderUser?._id?.toString?.() || "unknown";
  const key = `${recipientId}:${senderId}`;
  const senderName = safeName(senderUser);

  let entry = messageQueues.get(key);
  if (!entry) {
    entry = { messages: [], senderName, recipient: recipientUser, timer: null };
    messageQueues.set(key, entry);
  }
  entry.messages.push({ content: message.content, at: new Date() });

  if (!entry.timer) {
    entry.timer = setTimeout(async () => {
      try {
        const count = entry.messages.length;
        const subject = `${count} nouveau${count > 1 ? "x" : ""} message${
          count > 1 ? "s" : ""
        } de ${entry.senderName}`;
        const excerpts = entry.messages
          .slice(-3)
          .map((m) => `• ${escapeHtml(m.content).slice(0, 160)}`)
          .join("<br/>");

        const html = `<p>Bonjour ${safeName(entry.recipient)},</p>
                      <p>Vous avez reçu ${count} message${
          count > 1 ? "s" : ""
        } de <strong>${entry.senderName}</strong>.</p>
                      <p>${excerpts}</p>
                      <p><a href=\"https://ma-gestion-immo.netlify.app/dashboard/messages\">Ouvrir la messagerie</a></p>`;

        await sendMail({ from: process.env.MAIL_USER, to, subject, html });
      } catch (e) {
        console.warn("queueMessageEmail: send failed:", e.message);
      } finally {
        clearTimeout(entry.timer);
        messageQueues.delete(key);
      }
    }, MSG_WINDOW);
  }
}

// Queue a document email; groups per recipient across a short window
function queueDocumentEmails(recipientUsers, { name, type, by }) {
  const timestamp = new Date();
  for (const user of recipientUsers) {
    const to = user?.email;
    if (!to) continue;
    const key = user._id.toString();
    let entry = documentQueues.get(key);
    if (!entry) {
      entry = { items: [], recipient: user, timer: null };
      documentQueues.set(key, entry);
    }
    entry.items.push({ name, type, by, at: timestamp });

    if (!entry.timer) {
      entry.timer = setTimeout(async () => {
        try {
          const listHtml = entry.items
            .map(
              (it) =>
                `<li><strong>${escapeHtml(it.name)}</strong> (${escapeHtml(
                  it.type
                )}) — ajouté par ${escapeHtml(it.by)}</li>`
            )
            .join("");
          const subject = `Nouveau${
            entry.items.length > 1 ? "x" : ""
          } document${entry.items.length > 1 ? "s" : ""} ajouté${
            entry.items.length > 1 ? "s" : ""
          }`;
          const html = `<p>Bonjour ${safeName(entry.recipient)},</p>
                        <p>Les documents suivants ont été ajoutés à votre bail:</p>
                        <ul>${listHtml}</ul>
                        <p><a href=\"https://ma-gestion-immo.netlify.app/dashboard/documents\">Voir les documents</a></p>`;
          await sendMail({ from: process.env.MAIL_USER, to, subject, html });
        } catch (e) {
          console.warn("queueDocumentEmails: send failed:", e.message);
        } finally {
          clearTimeout(entry.timer);
          documentQueues.delete(key);
        }
      }, DOC_WINDOW);
    }
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = { queueMessageEmail, queueDocumentEmails };
