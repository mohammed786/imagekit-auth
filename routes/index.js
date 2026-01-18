const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
require("dotenv").config();
const router = express.Router();

const ImageKit = require("imagekit");
const { getSheetsClient } = require("../config/googleAuth");
const axios = require("axios");

const upload = multer({ storage: multer.memoryStorage() });

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

// Serve the index.html file for the root route
router.get("/auth", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = authHeader.split(" ")[1];

  try {
    await axios.get("https://dev-uymoi6w24fzybtjv.us.auth0.com/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    let mainSheet, firstCateDataSheet, secCatDataSheet;

    if (req.file) {
      const buffer = req.file.buffer;
      const workbook = xlsx.read(buffer, { type: "buffer" });

      mainSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Main"]);
      firstCateDataSheet = xlsx.utils.sheet_to_json(workbook.Sheets["Variants"]);
      secCatDataSheet = xlsx.utils.sheet_to_json(workbook.Sheets["SubVariants"]);
    } else if (req.body.sheetId) {
      const sheets = await getSheetsClient();
      const sheetId = req.body.sheetId;

      const getSheetData = async (range) => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: range,
        });
        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];
        const headers = rows[0];
        return rows.slice(1).map((row) => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
      };

      mainSheet = await getSheetData("Main");
      firstCateDataSheet = await getSheetData("Variants");
      secCatDataSheet = await getSheetData("SubVariants");
    } else {
      return res.status(400).json({ error: "No file uploaded or Sheet ID provided." });
    }

    // Key mappings from new headers to old keys
    const mainSheetKeyMap = {
      "enable/disable": "isActive",
      "product name": "productName",
      "show/hide prices": "showPrice",
      "brand": "brandName",
      "category": "categoryName",
      "sub category": "subCategoryName",
      "video url": "videoUrl",
      "warranty information": "warrantyInformation",
      "key features": "keyFeature",
      "tags": "tags",
      "images": { key: "images", transform: (value) => (value ? value.split(',').map(item => item.trim()) : []) },
    };



    const firstCatKeyMap = {
      "product name": "productName", 
      "label": "frtCatDataLabel",
      "description": "productContent",
      "unit": "unit",
      "order": "order",
      "images": { key: "firstLevImages", transform: (value) => (value ? value.split(',').map(item => item.trim()) : []) },
    };
    

    const secCatKeyMap = {
      "variant label": "secondCateLabel",
      "label": "dataLabel",
      "product description": "productDisc",
      "price": "price",
      "technical specification": "technicalSpecs",
      "product code": "productCode",
      "is active": "isActive",
      "unit": "unit",
      "order": "order",
      "images": { key: "images", transform: (value) => (value ? value.split(',').map(item => item.trim()) : []) },
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
        Object.entries(obj).map(([key, value]) => {
          const lowerCaseKey = key.toLowerCase();
          const mapEntry = keyMap[lowerCaseKey];
          if (mapEntry && typeof mapEntry === 'object' && mapEntry.key) {
             const newValue = mapEntry.transform ? mapEntry.transform(value) : value;
             return [mapEntry.key, newValue];
          }
          return [mapEntry || key, value];
        })
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
