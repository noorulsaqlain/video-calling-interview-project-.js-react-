import express from "express"

import { ENV } from "./lib/env.js";

const app = express()

console.log(ENV.PORT);
console.log(ENV.DB_URL);
app.get("/kela",(req,res) =>
{
    res.status(200).json({msg:"success api is runnimg im server"})
})
app.listen(ENV.PORT, () => console.log("Server is running on port:",ENV.PORT))