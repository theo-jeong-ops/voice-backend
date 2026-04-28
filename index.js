import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.json());

// Twilio setup
const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// Normalize AU numbers → E.164
function formatToE164(number) {
  if (!number) return null;

  const cleaned = String(number).replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) return cleaned;

  if (cleaned.startsWith("0")) {
    return "+61" + cleaned.slice(1);
  }

  if (cleaned.startsWith("61")) {
    return "+" + cleaned;
  }

  return null;
}

app.post("/booking-complete", async (req, res) => {
  console.log("HEADERS:", req.headers);
  console.log("BODY:", req.body);
  console.log("QUERY:", req.query);

  const data = {
    ...req.query,
    ...req.body,
  };

  console.log("Booking received:", data);

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    console.error("Missing Twilio env vars");
    return res.send("ok");
  }

  if (!client) {
    console.error("Twilio client not configured");
    return res.send("ok");
  }

  const toNumber = formatToE164(data.phone_number);

  if (!toNumber) {
    console.error("Invalid phone number:", data.phone_number);
    return res.send("ok");
  }

  const message = `Thanks ${data.name || "there"}, we’ve received your booking request for ${data.booking_date || "your requested date"} ${data.time_preference || ""}. The team will call you back shortly to confirm the exact time. DO NOT REPLY. ONLY CALL this number for additional bookings.`;

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: toNumber,
    });

    console.log("SMS sent to:", toNumber);
  } catch (err) {
    console.error("SMS failed:", err.message);
  }

  res.send("ok");
});

app.get("/health", (req, res) => {
  res.send("ok");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running on " + PORT));
