const axios = require("axios");
const Docker = require("dockerode");
const dotenv = require("dotenv");
const { exec } = require("child_process");
const path = require("path");

dotenv.config();

const URL = process.env.URL || "http://localhost:3000/version";
const CURRENT_IMAGE =
  process.env.CURRENT_IMAGE || "ghcr.io/bojanb98/upravljacke-kontrole/api";
const GH_WEBHOOK_SECRET = process.env.GH_WEBHOOK_SECRET;
const GHCR_PAT = process.env.GHCR_PAT;
const GHCR_USERNAME = process.env.GHCR_USERNAME;

const docker = new Docker();

const getLatestVersion = async () => {
  try {
    const response = await axios.get(URL);
    return response.data.version;
  } catch (error) {
    console.error("Error fetching latest version:", error);
    return null;
  }
};

const getCurrentVersion = async () => {
  try {
    const images = await docker.listImages({
      filters: { reference: [CURRENT_IMAGE] },
    });
    if (images.length > 0) {
      return images[0].RepoTags[0].split(":")[1];
    } else {
      console.error("Current image not found.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching current version:", error);
    return null;
  }
};

const checkAndUpdate = async () => {
  const latestVersion = await getLatestVersion();
  const currentVersion = await getCurrentVersion();

  if (latestVersion && currentVersion && latestVersion !== currentVersion) {
    console.log(
      `New version available: ${latestVersion}. Current version: ${currentVersion}.`
    );

    // Authenticate Docker with GHCR using the Personal Access Token
    exec(
      `echo ${GHCR_PAT} | docker login ghcr.io -u ${GHCR_USERNAME} --password-stdin`,
      (loginError, loginStdout, loginStderr) => {
        if (loginError) {
          console.error(`Error logging into GHCR: ${loginError.message}`);
          return;
        }
        if (loginStderr) {
          console.error(`Login stderr: ${loginStderr}`);
          return;
        }
        console.log(`Login stdout: ${loginStdout}`);

        // Redeploy the Docker Compose service with APP_VERSION as an environment variable
        const composeDirectory = path.join(__dirname, "../");
        exec(
          `docker-compose -f ${composeDirectory}/docker-compose.yaml down && APP_VERSION=${latestVersion} 
          docker-compose -f ${composeDirectory}/docker-compose.yaml  up -d`,
          (composeError, composeStdout) => {
            if (composeError) {
              console.error(
                `Error redeploying service: ${composeError.message}`
              );
              return;
            }
            console.log(`Service redeployed successfully: ${composeStdout}`);
          }
        );
      }
    );
  } else {
    console.log("No update needed.");
  }
};

checkAndUpdate();
