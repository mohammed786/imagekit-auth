const express = require("express");
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
    const trimValues = (obj) => {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          typeof value === "string" ? value.trim() : value,
        ])
      );
    };

    const data = mainSheet.map((product) => {
      const { productName, ...productDetails } = product;

      // Trim product details
      const trimmedProductDetails = trimValues(productDetails);
      const trimmedProductName = productName.trim();

      // Find all entries in firstCateData related to this product
      const firstCateData = firstCateDataSheet
        .filter((fcd) => fcd.productName.trim() === trimmedProductName)
        .map((fcd) => {
          const { frtCatDataLabel, productName, ...fcdDetails } = fcd;

          // Trim first category details
          const trimmedFcdDetails = trimValues(fcdDetails);
          const trimmedFrtCatDataLabel = frtCatDataLabel.trim();

          // Find all entries in secCatData related to this frtCatDataLabel
          const secCatData = secCatDataSheet
            .filter(
              (scd) => scd.frtCatDataLabel.trim() === trimmedFrtCatDataLabel
            )
            .map(({ frtCatDataLabel, ...scdDetails }) =>
              trimValues(scdDetails)
            );

          return {
            frtCatDataLabel: trimmedFrtCatDataLabel.split("_")[1],
            ...trimmedFcdDetails,
            secCatData,
          };
        });

      return {
        ...trimmedProductDetails,
        productName: trimmedProductName,
        firstCateData,
      };
    });

    // Return the JSON data
    res.json({ data });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Failed to process the file." });
  }
});

module.exports = router;
