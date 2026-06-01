const { createHttpHandler } = require('../src/interactions/http');

module.exports = createHttpHandler();

module.exports.config = {
  api: {
    bodyParser: false
  }
};
