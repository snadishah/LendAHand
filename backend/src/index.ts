import "./env.js";
import { app } from "./app.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, () => {
  console.log(`LendAHand API listening on http://localhost:${PORT}`);
});
