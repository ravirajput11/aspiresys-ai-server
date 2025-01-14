const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

app.get("/api/auth/token", async (req, res) => {
  try {
    const tokenRequest = {
      grant_type: "client_credentials",
      client_id: process.env.AZURE_CLIENT_ID ?? "",
      client_secret: process.env.AZURE_CLIENT_SECRET ?? "",
      scope: process.env.AZURE_SCOPE ?? "",
    };
    const response = await axios.post(
      `${process.env.AZURE_AUTHORITY}/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams(tokenRequest),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/web-bff/customers", async (req, res) => {
  try {
    const headers = {
      Authorization: req.header("Authorization"),
      "Content-Type": "application/json",
    };
    console.log("req.body", req.body);
    const response = await axios.post(
      `https://dev.aurascc.net/web-bff/customers`,
      isEmptyObject(req.body) ? null : req.body,
      { headers }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/web-bff/customers/login", async (req, res) => {
  try {
    const headers = {
      Authorization: req.header("Authorization"),
      "Content-Type": "application/json",
    };

    const response = await axios.post(
      `https://dev.aurascc.net/web-bff/customers/login`,
      isEmptyObject(req.body) ? null : req.body,
      { headers }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).send("Internal Server Error");
  }
});


// app.post("/api/web-bff/auras-gpt-spa", async (req, res) => {
//   try {
//     const headers = {
//       Authorization: req.header("Authorization"),
//       "Content-Type": "application/json",
//     };
//     const response = await axios.post(
//       `https://auras-dc-dev-api.azure-api.net/web-bff/auras-gpt-spa`,
//       isEmptyObject(req.body) ? null : req.body,
//       { params: req.query, headers }
//     );
//     res.json(response.data);
//   } catch (error) {
//     console.error("Error exchanging code for token:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });
app.use("*", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
