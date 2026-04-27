const path = require("node:path");
const { createJiti } = require("jiti");

const apiRoot = path.resolve(__dirname, "../../..");
const jiti = createJiti(path.join(apiRoot, "tests-engine-workers-entry.js"));

function loadTsModule(relativePath) {
  return jiti(path.join(apiRoot, relativePath));
}

module.exports = {
  apiRoot,
  loadTsModule,
};
