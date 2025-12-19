import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10 // Maximum 10 files
    }
});

// Middleware for multiple image uploads
export const uploadTaskImages = (req, res, next) => {
    console.log('Multer middleware - Content-Type:', req.headers['content-type']);
    console.log('Multer middleware - Raw body before multer:', req.body);

    upload.array('images', 10)(req, res, (err) => {
        if (err) {
            console.log('Multer error:', err);
            return next(err);
        }
        console.log('Multer middleware - req.body after multer:', req.body);
        console.log('Multer middleware - req.files:', req.files);
        console.log('Multer middleware - assignees value:', req.body.assignees);
        console.log('Multer middleware - assignees type:', typeof req.body.assignees);
        next();
    });
};

// Middleware for payment slip upload (single image)
export const uploadPaymentSlip = (req, res, next) => {
    upload.single('slipImage')(req, res, (err) => {
        if (err) {
            console.log('Multer error:', err);
            return next(err);
        }
        next();
    });
};

// Middleware for profile picture upload (single image)
export const uploadProfilePicture = (req, res, next) => {
    upload.single('profilePicture')(req, res, (err) => {
        if (err) {
            console.log('Multer error:', err);
            return next(err);
        }
        next();
    });
};

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File too large. Maximum size is 5MB per file.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                message: 'Too many files. Maximum 10 files allowed.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                message: 'Unexpected field name. Use "images" field for file uploads.'
            });
        }
    }

    if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
            message: 'Only image files are allowed!'
        });
    }

    next(error);
};

export default upload;
