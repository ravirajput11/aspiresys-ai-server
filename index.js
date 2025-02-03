const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");

const { Readable } = require("stream"); // Instead of buffer, use streams for better memory management
const { v4: uuidv4 } = require("uuid"); // Generate unique job IDs

dotenv.config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

const jobs = {}; // Store job statuses

// Multer configuration for file upload
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     return cb(null, "./uploads");
//   },
//   filename: function (req, file, cb) {
//     const uniqueFileName = `${Date.now()}-${file.originalname}`;
//     return cb(null, uniqueFileName);
//   },
// });
// const upload = multer({ storage: storage });

// Configure multer with limits and memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  },
});

// const cleanupMiddleware = (req, res, next) => {
//   if (req.file && req.file.path) {
//     fs.unlink(req.file.path, (err) => {
//       if (err) console.error('Cleanup error:', err);
//     });
//   }
//   next();
// };
// // Apply to route
// app.post("/api/...", upload.single("file"), cleanupMiddleware, ...);

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
// app.post(
//   "/api/bff/users/xstore-chatgpt",
//   upload.single("file"),
//   async (req, res) => {
//     const userQuery = req.query.userQuery;

//     try {
//       const headers = {
//         Authorization: req.header("Authorization"),
//         "Content-Type": "multipart/form-data",
//       };
//       const formData = new FormData();
//       formData.append("file", fs.createReadStream(req.file.path)); // Append the file

//       const URL = `https://auras-dc-dev-api.azure-api.net/chatgpt/bff/users/xstore-chatgpt?userQuery=`;
//       // const URL = `http://localhost:8080/bff/users/xstore-chatgpt`

//       const response = await axios.post(URL, formData, {
//         params: { userQuery }, // Send query as URL parameter
//         headers,
//       });
//       return res.json(response.data);
//     } catch (error) {
//       console.error("Error:", error);
//       res.status(500).send({ "Internal Server Error": error });
//     }
//   }
// );

// Updated chat endpoint
// app.post(
//   "/api/bff/users/xstore-chatgpt",
//   upload.single("file"),
//   async (req, res) => {
//     try {
//       // Validate inputs
//       if (!req.query.userQuery) {
//         return res.status(400).json({ error: "userQuery is required" });
//       }

//       if (!req.file) {
//         return res.status(400).json({ error: "File is required" });
//       }

//       // Create form data for upstream API
//       const formData = new FormData();

//       // In file handler
//       const fileStream = Readable.from(req.file.buffer);
//       formData.append("file", fileStream, {
//         filename: req.file.originalname,
//         contentType: req.file.mimetype,
//         knownLength: req.file.size,
//       });

//       // formData.append("file", req.file.buffer, {
//       //   filename: req.file.originalname,
//       //   contentType: req.file.mimetype,
//       //   knownLength: req.file.size,
//       // });

//       const response = await axios.post(
//         "https://auras-dc-dev-api.azure-api.net/chatgpt/bff/users/xstore-chatgpt",
//         formData,
//         {
//           params: { userQuery: req.query.userQuery },
//           headers: {
//             Authorization: req.header("Authorization"),
//             ...formData.getHeaders(),
//           },
//         }
//       );

//       res.json(response.data);
//     } catch (error) {
//       console.error("Error:", error);

//       // Enhanced error handling
//       const status = error.response?.status || 500;
//       const message =
//         error.response?.data?.message ||
//         error.message ||
//         "Internal server error";

//       res.status(status).json({ error: message });
//     }
//   }
// );

// Start processing request
app.post(
  "/api/bff/users/xstore-chatgpt",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.query.userQuery)
        return res.status(400).json({ error: "userQuery is required" });
      if (!req.file) return res.status(400).json({ error: "File is required" });

      const jobId = uuidv4(); // Generate a unique job ID
      jobs[jobId] = { status: "processing" }; // Set initial status

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
  } catch (error) {
    jobs[jobId] = { status: "failed", error: error.message };
  }
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
