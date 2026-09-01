const sharp = require("sharp");

// Compress avatar image
// Input: buffer of any image format
// Output: compressed JPEG buffer, max 500x500px, ~80KB typical
const compressAvatar = async (inputBuffer) => {
  return await sharp(inputBuffer)
    .resize(400, 400, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toBuffer();
};

// Compress cover image
// Input: buffer of any image format
// Output: compressed JPEG buffer, max 800x450px (16:9), ~150KB typical
const compressCover = async (inputBuffer) => {
  return await sharp(inputBuffer)
    .resize(800, 450, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({
      quality: 82,
      progressive: true,
    })
    .toBuffer();
};

module.exports = { compressAvatar, compressCover };
