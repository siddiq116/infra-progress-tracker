import multer from "multer";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Buffered in memory (not disk) so this works on read-only serverless
// filesystems; routes/progress.js streams the buffer to Vercel Blob storage.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP or GIF images are allowed"));
    }
    cb(null, true);
  },
});
