const fs = require('fs');
const path = require('path');

const deleteFile = (fileName) => {
  const filePath = path.join('images', fileName);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(err);
    }
  });
};

exports.deleteFile = deleteFile;
