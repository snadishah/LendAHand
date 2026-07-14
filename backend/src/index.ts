import "./instrument.js";
import { env } from "./env.js";
import { app } from "./app.js";
import { autoReleaseExpiredSubmissions } from "./services/task.service.js";
import { processEmailJobs } from "./services/email.service.js";
import { isEmailConfigured } from "./lib/email.js";

app.listen(env.PORT, () => {
  console.log(`LendAHand API listening on http://localhost:${env.PORT}`);
  console.log(`Email delivery: ${isEmailConfigured() ? "enabled" : "disabled (set RESEND_API_KEY)"}`);
});

// Safety-net sweep: release escrow on submitted tasks a poster never confirmed,
// so a helper's payment can't be trapped. Runs at startup and hourly after.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
async function runSweep() {
  try {
    const released = await autoReleaseExpiredSubmissions();
    if (released > 0) console.log(`Auto-released ${released} expired submitted task(s).`);
  } catch (err) {
    console.error("Auto-release sweep failed", err);
  }
}
runSweep();
setInterval(runSweep, SWEEP_INTERVAL_MS).unref();

// Outbox worker: deliver queued emails every 20s (no-op until email configured).
const EMAIL_INTERVAL_MS = 20 * 1000;
async function runEmailWorker() {
  try {
    await processEmailJobs();
  } catch (err) {
    console.error("Email worker failed", err);
  }
}
setInterval(runEmailWorker, EMAIL_INTERVAL_MS).unref();
