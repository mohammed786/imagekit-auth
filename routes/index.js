const express = require('express');
const multer = require("multer");
const xlsx = require("xlsx");

const router = express.Router();

const ImageKit = require("imagekit");

const upload = multer({ storage: multer.memoryStorage() });

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

// Serve the index.html file for the root route
router.get('/auth', (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

router.post("/upload", upload.single("file"), (req, res) => {
  try {
    // Ensure a file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Read the file buffer directly from memory
    const buffer = req.file.buffer;

    // Parse the Excel file from the buffer
    const workbook = xlsx.read(buffer, { type: "buffer" });

    // Parse each sheet into JSON
    const mainSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Main"]);
    const firstCateDataSheet = xlsx.utils.sheet_to_json(
      workbook.Sheets["firstCateData"]
    );
    const secCatDataSheet = xlsx.utils.sheet_to_json(
      workbook.Sheets["secCatData"]
    );

    // Transform data into nested JSON format
    const data = mainSheet.map((product) => {
      const { productName, ...productDetails } = product;

      // Find all entries in firstCateData related to this product
      const firstCateData = firstCateDataSheet
        .filter((fcd) => fcd.productName === productName)
        .map((fcd) => {
          const { frtCatDataLabel, ...fcdDetails } = fcd;

          // Find all entries in secCatData related to this frtCatDataLabel
          const secCatData = secCatDataSheet
            .filter((scd) => scd.frtCatDataLabel === frtCatDataLabel)
            .map(({ frtCatDataLabel, ...scdDetails }) => scdDetails);

          return { frtCatDataLabel, ...fcdDetails, secCatData };
        });

      return { ...productDetails, firstCateData };
    });

    // Return the JSON data
    res.json({ data });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Failed to process the file." });
  }
});

module.exports = router;
