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
router.get("/auth", (req, res) => {
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

    const mainSheetMap = {};
    const firstCategoryMap = {};
    const secondCategoryMap = {};

    mainSheet.forEach((product) => {
      mainSheetMap[product.productName] = trimValues(product);
    });

    firstCateDataSheet.forEach((firstCat) => {
      const { productName, ...firstCatData } = firstCat;
      if (firstCategoryMap[productName] === undefined) {
        firstCategoryMap[productName] = [trimValues(firstCatData)];
      } else {
        firstCategoryMap[productName].push(trimValues(firstCatData));
      }
    });
    secCatDataSheet.forEach((secCat) => {
      const { frtCatDataLabel, ...secCatData } = secCat;
      if (secondCategoryMap[frtCatDataLabel] === undefined) {
        secondCategoryMap[frtCatDataLabel] = [trimValues(secCatData)];
      } else {
        secondCategoryMap[frtCatDataLabel].push(trimValues(secCatData));
      }
    });

    const finalProducts = [];

    Object.keys(mainSheetMap).forEach((productName) => {
      const product = mainSheetMap[productName];
      const firstCategoryData = firstCategoryMap[productName];
      const firstCategoryDataMap = {};
      firstCategoryData.forEach((firstCat) => {
        firstCategoryDataMap[firstCat.frtCatDataLabel] = firstCat;
      });

      const firstCategoryDataKeys = Object.keys(firstCategoryDataMap);

      const firstCategoryDataArray = firstCategoryDataKeys.map((key) => {
        const firstCat = firstCategoryDataMap[key];
        const secondCategoryData = secondCategoryMap[`${productName}_${firstCat.frtCatDataLabel}`];
        return {
          ...firstCat,
          secCatData: secondCategoryData,
        };
      });

      finalProducts.push({
        ...product,
        firstCateData: firstCategoryDataArray,
      });
    });
    
    res.json({ data: finalProducts });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Failed to process the file." });
  }
});

module.exports = router;
