const { google } = require('googleapis');
const path = require('path');

const getSheetsClient = async () => {
  try {
    let authOptions = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    };

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        authOptions.credentials = credentials;
      } catch (parseError) {
        console.error("Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:", parseError);
        throw new Error("Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON environment variable.");
      }
    } else {
      const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS 
        ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        : path.join(process.cwd(), 'service-account.json');
      authOptions.keyFile = keyFile;
    }

    const auth = new google.auth.GoogleAuth(authOptions);

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    return sheets;
  } catch (error) {
    console.error("Error initializing Google Sheets client:", error);
    throw new Error("Failed to initialize Google Sheets client. Please check your credentials.");
  }
};

module.exports = { getSheetsClient };
