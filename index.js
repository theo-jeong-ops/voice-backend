
import express from "express";

const app = express();
app.use(express.json());

app.post("/booking-complete", (req, res) => {
  console.log("Booking received:", req.body);
  res.send("ok");
});

app.get("/health", (req, res) => {
  res.send("ok");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running on " + PORT));
