const { handleRequest } = require('../serve');

module.exports = async (req, res) => {
  return handleRequest(req, res);
};
