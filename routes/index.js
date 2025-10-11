const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
require("dotenv").config();
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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const buffer = req.file.buffer;
    const workbook = xlsx.read(buffer, { type: "buffer" });

    const mainSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Main"]);
    const firstCateDataSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Variants"]);
    const secCatDataSheet = xlsx.utils.sheet_to_json(workbook.Sheets["SubVariants"]);

    // Key mappings from new headers to old keys
    const mainSheetKeyMap = {
      "Enable/Disable": "isActive",
      "Product Name": "productName",
      "Show/Hide Prices": "showPrice",
      "Brand": "brandName",
      "Category": "categoryName",
      "Sub Category": "subCategoryName",
      "Video Url": "videoUrl",
      "Warranty Information": "warrantyInformation",
      "Key Features": "keyFeature",
      "Tags": "tags"
    };

    const firstCatKeyMap = {
      "Product Name": "productName", 
      "Label": "frtCatDataLabel",
      "Description": "productContent",
      "Unit": "unit",
      "Order": "order"
    };
    

    const secCatKeyMap = {
      "Variant Label": "secondCateLabel",
      "Label": "dataLabel",
      "Product Description": "productDisc",
      "Price": "price",
      "Technical Specification": "technicalSpecs",
      "Product Code": "productCode",
      "Is Active": "isActive",
      "Unit": "unit",
      "Order": "order"
    };
    

    const trimValues = (obj) => {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          typeof value === "string" ? value.trim() === "Enable" || value.trim() === "Show" || value.trim() : value
        ])
      );
    };

    const mapKeys = (obj, keyMap) => {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [keyMap[key] || key, value])
      );
    };

    const mainSheetMap = {};
    const firstCategoryMap = {};
    const secondCategoryMap = {};

    mainSheet.forEach((product) => {
      const trimmedProduct = trimValues(product);
      const productKey = product["Product Name"].toLowerCase()
      mainSheetMap[productKey] = mapKeys(trimmedProduct, mainSheetKeyMap);
    });

    firstCateDataSheet.forEach((firstCat) => {
      const trimmedFirstCat = trimValues(firstCat);
      const { ["Product Name"]: productName, ...firstCatData } = trimmedFirstCat;
      const mappedFirstCat = mapKeys(firstCatData, firstCatKeyMap);
      const productkey = productName.toLowerCase()
      if (firstCategoryMap[productkey] === undefined) {
        firstCategoryMap[productkey] = [mappedFirstCat];
      } else {
        firstCategoryMap[productkey].push(mappedFirstCat);
      }
    });

    secCatDataSheet.forEach((secCat) => {
      const trimmedSecCat = trimValues(secCat);
      const { ["Variant Label"]: Label, ...secCatData } = trimmedSecCat;
      const mappedSecCat = mapKeys(secCatData, secCatKeyMap);
      const labelKey = Label.toLowerCase()
      if (secondCategoryMap[labelKey] === undefined) {
        secondCategoryMap[labelKey] = [mappedSecCat];
      } else {
        secondCategoryMap[labelKey].push(mappedSecCat);
      }
    });

    const finalProducts = [];

    Object.keys(mainSheetMap).forEach((productName) => {
      const product = mainSheetMap[productName];
      const firstCategoryData = firstCategoryMap[productName] || [];
      const firstCategoryDataMap = {};
      firstCategoryData.forEach((firstCat) => {
        const firstCatkey = firstCat["frtCatDataLabel"].toLowerCase();
        firstCategoryDataMap[firstCatkey] = firstCat;
      });

      const firstCategoryDataKeys = Object.keys(firstCategoryDataMap);

      const firstCategoryDataArray = firstCategoryDataKeys.map((key) => {
        const firstCat = firstCategoryDataMap[key];
        const secondCategoryData = secondCategoryMap[`${productName}_${key}`] || [];
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
    console.error("ErrorBridgerowser: Error processing file:", error);
    res.status(500).json({ error: "Failed to process the file." });
  }
});

module.exports = router;
