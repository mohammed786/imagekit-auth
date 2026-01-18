const express = require("express");
const path = require("path");
const indexRouter = require("./routes/index");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// allow cross-origin requests
app.use(cors());

// Use the router for handling routes
app.use("/", indexRouter);

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
