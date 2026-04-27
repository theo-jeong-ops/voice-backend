import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.json());

// Twilio setup (only runs if env vars exist)
const client = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

app.post("/booking-complete", async (req, res) => {
  const data = req.body;

  console.log("Booking received:", data);

  // Only send SMS if Twilio is configured
  if (client) {
    const message = `Thanks ${data.name}, we’ve received your booking request for ${data.booking_date} ${data.time_preference}. The team will call you back shortly to confirm the exact time. DO NOT REPLY. ONLY CALL this number for additional bookings.`;

    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER,
        to: data.phone_number,
      });

      console.log("SMS sent");
    } catch (err) {
      console.error("SMS failed:", err.message);
    }
  } else {
    console.log("Twilio not configured — skipping SMS");
  }

  res.send("ok");
});

app.get("/health", (req, res) => {
  res.send("ok");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running on " + PORT));
