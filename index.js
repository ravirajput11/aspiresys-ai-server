const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const FormData = require("form-data");

const { Readable } = require("stream"); // Instead of buffer, use streams for better memory management
const { v4: uuidv4 } = require("uuid"); // Generate unique job IDs

dotenv.config();

const app = express();
const port = 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

const jobs = {}; // Store job statuses
const JOB_CLEANUP_TIME = 10 * 60 * 1000; // 10 minutes

// Configure multer with limits and memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
});

// 🌟 Utility: Create a new job
const createJob = () => {
  const jobId = uuidv4();
  jobs[jobId] = { status: "processing" };
  return jobId;
};

// Cleanup function to remove old jobs
function cleanupJob(jobId) {
  setTimeout(() => {
    delete jobs[jobId];
  }, JOB_CLEANUP_TIME);
}

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

// Start processing request
app.post(
  "/api/bff/users/xstore-chatgpt",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.query.userQuery)
        return res.status(400).json({ error: "userQuery is required" });
      if (!req.file) return res.status(400).json({ error: "File is required" });

      const jobId = createJob(); // Create job

      // Process the request asynchronously
      processChatRequest(
        jobId,
        req.file,
        req.query.userQuery,
        req.header("Authorization")
      );

      res.json({ jobId }); // Return job ID immediately
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Polling endpoint to check job status
app.get("/api/bff/users/xstore-chatgpt/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });

  res.json(job);
});

// Asynchronous function to process the chat request
async function processChatRequest(jobId, file, userQuery, authHeader) {
  try {
    const formData = new FormData();
    const fileStream = Readable.from(file.buffer);
    formData.append("file", fileStream, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await axios.post(
      "https://auras-dc-dev-api.azure-api.net/chatgpt/bff/users/xstore-chatgpt",
      formData,
      {
        params: { userQuery },
        headers: { Authorization: authHeader, ...formData.getHeaders() },
      }
    );

    jobs[jobId] = { status: "completed", data: response.data }; // Store response data
    cleanupJob(jobId); // Schedule cleanup
  } catch (error) {
    jobs[jobId] = {
      status: "failed",
      error: error.response?.data?.message || error.message,
    };
    cleanupJob(jobId); // Schedule cleanup for failed jobs
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
