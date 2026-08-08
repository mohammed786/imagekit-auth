const express = require("express");
const path = require("path");
const indexRouter = require("./routes/index");
const cors = require("cors");
const inquiryRouter = require("./routes/inquiries");
const publicInquiryRouter = require("./routes/publicInquiries");
const searchRouter = require("./routes/search");
const { initDatabase } = require("./config/initDatabase");

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'authtoken', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
};

// allow cross-origin requests
app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// Use the router for handling routes
app.use("/", indexRouter);
app.use("/api/inquiries", inquiryRouter);
app.use("/api/public/inquiries", publicInquiryRouter);
app.use("/api/v1/search", searchRouter);

// Catch-all route for handling 404 errors
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
      console.log(`Authenticated Inquiry API available at http://localhost:${PORT}/api/inquiries`);
      console.log(`Public Inquiry API available at http://localhost:${PORT}/api/public/inquiries`);
      console.log(`Search API available at http://localhost:${PORT}/api/v1/search`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
