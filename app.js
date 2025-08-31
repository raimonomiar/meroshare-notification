import axios from "axios";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Step 1: Login to get Authorization token
async function login() {
  try {
    var token = "";
    console.log(`${process.env.MEROSHARE_API}/api/meroShare/auth/`);
    const response = await axios.post(
      `${process.env.MEROSHARE_API}/api/meroShare/auth/`,
      {
        clientId: process.env.MEROSHARE_CLIENT_ID,
        username: process.env.MEROSHARE_USERNAME,
        password: process.env.MEROSHARE_PASSWORD,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
          "Authorization": "null",
          "Origin": "https://meroshare.cdsc.com.np",
          "Referer": "https://meroshare.cdsc.com.np/",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
        }
      }
    );


    if (response.headers["authorization"]) {
      token = response.headers["authorization"];
    }

    return token;
  } catch (error) {
    console.error("Login failed:", error.response?.data || error.message);
    throw error;
  }
}

// Step 2: Use token to fetch company issues
async function fetchApplicableIssues(token) {
  try {

    const response = await axios.post(
      `${process.env.MEROSHARE_API}/api/meroShare/companyShare/applicableIssue/`,
      {
        filterFieldParams: [
          { key: "companyIssue.companyISIN.script", alias: "Scrip" },
          { key: "companyIssue.companyISIN.company.name", alias: "Company Name" },
          {
            key: "companyIssue.assignedToClient.name",
            value: "",
            alias: "Issue Manager"
          }
        ],
        page: 1,
        size: 50,
        searchRoleViewConstants: "VIEW_APPLICABLE_SHARE",
        filterDateParams: [
          { key: "minIssueOpenDate", condition: "", alias: "", value: "" },
          { key: "maxIssueCloseDate", condition: "", alias: "", value: "" }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
          "Authorization": token, // 👈 use token here
          "Origin": "https://meroshare.cdsc.com.np",
          "Referer": "https://meroshare.cdsc.com.np/",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
        }
      }
    );

    const allShares = response.data.object;

    // Step 3: Filter only Ordinary Shares, exclude "edit" actions
    const ordinaryScrips = allShares
      .filter(
        (share) =>
          share.shareGroupName === "Ordinary Shares"
          &&!(share.action && share.action === "edit")
      )
      .map((share) => share.scrip);

    console.log("Filtered Ordinary Shares Scrips:", ordinaryScrips);

    return ordinaryScrips;
  } catch (error) {
    console.error(
      "Fetch failed:",
      error.response?.status,
      error.response?.data || error.message
    );
  }
}

async function sendEmail(scrips) {
  // configure your email account
  let transporter = nodemailer.createTransport({
    service: "gmail", // if using Gmail
    auth: {
      user: `${process.env.GMAIL_USER}`,
      pass: `${process.env.GMAIL_PASSWORD}` // ⚠️ use App Password, not your normal password
    }
  });

  const message = {
    from: `"MeroShare Alert" <${process.env.EMAIL1}>`,
    to: [`${process.env.EMAIL1}`,`${process.env.EMAIL2}`], // replace with your address
    subject: "IPO info",
    text:
      scrips.length > 0
        ? `Here are the ordinary scrips: ${scrips.join(", ")}`
        : "No ordinary shares found."
  };

  try {
    let info = await transporter.sendMail(message);
    console.log("✅ Email sent:", info.response);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
  }
}


// Run the workflow
(async () => {
    if (process.env.NODE_ENV !== "production") {
        dotenv.config();
    }
    const token = await login();
    console.log("Retrieved token:", token);
    var scrips = await fetchApplicableIssues(token);
    await sendEmail(scrips);
})();

