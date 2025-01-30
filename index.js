const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");

dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    return cb(null, uniqueFileName);
  },
});
const upload = multer({ storage: storage });

// cloud token endpoint
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
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// local token endpoint
app.get("/api/auth/token/local", async (req, res) => {
  try {
    const tokenRequest = {
      grant_type: "client_credentials",
      client_id: process.env.CLIENT_ID ?? "",
      client_secret: process.env.CLIENT_SECRET ?? "",
    };
    const URL = `http://localhost:8081/realms/springboot-oauth-keycloak/protocol/openid-connect/token`;
    const response = await axios.post(
      `${URL}`,
      new URLSearchParams(tokenRequest),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// register user endpoint
app.post("/api/web-bff/customers", async (req, res) => {
  try {
    const headers = {
      Authorization: req.header("Authorization"),
      "Content-Type": "application/json",
    };
    const response = await axios.post(
      `https://dev.aurascc.net/web-bff/customers`,
      isEmptyObject(req.body) ? null : req.body,
      { headers }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// login user endpoint
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
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// chat endpoint
app.post(
  "/api/bff/users/xstore-chatgpt",
  upload.single("file"),
  async (req, res) => {
    const userQuery = req.query.userQuery;

    try {
      const headers = {
        Authorization: req.header("Authorization"),
        "Content-Type": "multipart/form-data",
      };
      const formData = new FormData();
      formData.append("file", fs.createReadStream(req.file.path)); // Append the file

      const URL = `https://auras-dc-dev-api.azure-api.net/chatgpt/bff/users/xstore-chatgpt?userQuery=`;
      // const URL = `http://localhost:8080/bff/users/xstore-chatgpt`

      const response = await axios.post(URL, formData, {
        params: { userQuery }, // Send query as URL parameter
        headers,
      });
      return res.json(response.data);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Internal Server Error", error);
    }
  }
);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
