import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Twilio setup
const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

// Normalize AU numbers -> E.164
function formatToE164(number) {
  if (!number) return null;
  const cleaned = String(number).replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("61")) return "+" + cleaned;
  return null;
}

// Build the Vapi-shaped response (when called by Vapi) or plain "ok" (curl test)
function reply(res, toolCallId, payload) {
  if (toolCallId) {
    return res.json({
      results: [{ toolCallId, result: payload }],
    });
  }
  return res.send(payload);
}

app.post("/booking-complete", async (req, res) => {
  console.log("HEADERS:", req.headers);
  console.log("BODY:", JSON.stringify(req.body, null, 2));

  // Detect Vapi tool-call payload vs. direct (curl) payload.
  const toolCalls = req.body?.message?.toolCalls;
  let data;
  let toolCallId = null;

  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const tc = toolCalls[0];
    toolCallId = tc.id;
    const args = tc.function?.arguments;
    try {
      data = typeof args === "string" ? JSON.parse(args) : args || {};
    } catch (err) {
      console.error("Failed to parse tool arguments:", err.message);
      data = {};
    }
    console.log("Vapi tool call detected. toolCallId:", toolCallId);
  } else {
    // Direct POST (e.g. curl test)
    data = { ...req.query, ...req.body };
  }

  console.log("Booking received:", data);

  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_FROM_NUMBER
  ) {
    console.error("Missing Twilio env vars");
    return reply(res, toolCallId, "ok");
  }

  if (!client) {
    console.error("Twilio client not configured");
    return reply(res, toolCallId, "ok");
  }

  const toNumber = formatToE164(data.phone_number);
  if (!toNumber) {
    console.error("Invalid phone number:", data.phone_number);
    return reply(res, toolCallId, "ok");
  }

  const message =
    `Thanks ${data.name || "there"}, we've received your booking request for ` +
    `${data.booking_date || "your requested date"} ${data.time_preference || ""}. ` +
    `The team will call you back shortly to confirm the exact time. ` +
    `DO NOT REPLY. ONLY CALL this number for additional bookings.`;

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

  return reply(res, toolCallId, "ok");
});

app.get("/health", (req, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running on " + PORT));
