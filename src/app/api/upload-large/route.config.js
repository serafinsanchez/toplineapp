// Configuration for the /api/upload-large route
module.exports = {
  api: {
    bodyParser: {
      sizeLimit: '26mb',
    },
    responseLimit: '26mb',
  },
}; 