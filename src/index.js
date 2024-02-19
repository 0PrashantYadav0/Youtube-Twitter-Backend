import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"
import swaggerUi from "swagger-ui-express"
import swaggerdoc from "../doc/swagger.json" with { type: "json" };

dotenv.config({
  path: './env'
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerdoc))

connectDB()
.then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log("Server is listening on port " + process.env.PORT);
  })
})
.catch((err) => {
  console.log("MongoDB connection error: " + err)
})