import AWS from 'aws-sdk';

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

/**
 * Utility function to add delay between operations
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} Promise that resolves after delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/*
 * S3 Bucket Configuration Notes:
 * 
 * If you need public access to uploaded images, you have two options:
 * 
 * 1. Configure S3 Bucket Policy (Recommended):
 *    - Go to your S3 bucket → Permissions → Bucket Policy
 *    - Add a policy that allows public read access to task-images/ folder
 *    - Example policy:
 *      {
 *        "Version": "2012-10-17",
 *        "Statement": [
 *          {
 *            "Sid": "PublicReadGetObject",
 *            "Effect": "Allow",
 *            "Principal": "*",
 *            "Action": "s3:GetObject",
 *            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/task-images/*"
 *          }
 *        ]
 *      }
 * 
 * 2. Use Presigned URLs (More Secure):
 *    - Images are private by default
 *    - Generate presigned URLs when needed using generatePresignedUrl()
 *    - URLs expire after specified time (default: 1 hour)
 */

/**
 * Upload image file to S3 bucket
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} originalName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} Upload result with location and size info
 */
async function uploadImageToS3(fileBuffer, originalName, mimeType) {
    try {
        // Generate unique filename
        const fileExtension = originalName.split('.').pop();
        const fileName = `task-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
        
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: mimeType
            // Note: ACL removed because the bucket doesn't support ACLs
            // For public access, configure bucket policy or use presigned URLs
        };

        const result = await s3.upload(params).promise();
        
        if (result.Location) {
            console.log('Image uploaded to S3 successfully ✅');
        }

        return {
            location: result.Location,
            key: result.Key,
            size: formatBytes(fileBuffer.length),
            fileName: originalName
        };
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('Failed to upload image to S3');
    }
}

/**
 * Upload multiple images to S3 one by one
 * @param {Array} files - Array of file objects
 * @returns {Promise<Array>} Array of upload results
 */
async function uploadMultipleImages(files) {
    try {
        const results = [];
        const errors = [];
        
        console.log(`Starting upload of ${files.length} images...`);
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                console.log(`Uploading image ${i + 1}/${files.length}: ${file.originalname}`);
                
                const result = await uploadImageToS3(file.buffer, file.originalname, file.mimetype);
                results.push(result);
                
                console.log(`✅ Successfully uploaded: ${file.originalname}`);
                
                // Add small delay between uploads to avoid overwhelming S3
                if (i < files.length - 1) {
                    await delay(100); // 100ms delay
                }
            } catch (error) {
                console.error(`❌ Failed to upload ${file.originalname}:`, error.message);
                errors.push({
                    fileName: file.originalname,
                    error: error.message
                });
            }
        }
        
        // If some uploads failed, throw an error with details
        if (errors.length > 0) {
            const errorMessage = `Failed to upload ${errors.length} out of ${files.length} images. Errors: ${errors.map(e => `${e.fileName}: ${e.error}`).join(', ')}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
        
        console.log(`✅ All ${files.length} images uploaded successfully!`);
        return results;
    } catch (error) {
        console.error('Error in uploadMultipleImages:', error);
        throw error;
    }
}

/**
 * Upload multiple images to S3 one by one (allows partial success)
 * @param {Array} files - Array of file objects
 * @param {boolean} allowPartialSuccess - Whether to continue if some uploads fail
 * @returns {Promise<Object>} Object with results and errors
 */
async function uploadMultipleImagesWithPartialSuccess(files, allowPartialSuccess = true) {
    try {
        const results = [];
        const errors = [];
        
        console.log(`Starting upload of ${files.length} images...`);
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                console.log(`Uploading image ${i + 1}/${files.length}: ${file.originalname}`);
                
                const result = await uploadImageToS3(file.buffer, file.originalname, file.mimetype);
                results.push(result);
                
                console.log(`✅ Successfully uploaded: ${file.originalname}`);
                
                // Add small delay between uploads to avoid overwhelming S3
                if (i < files.length - 1) {
                    await delay(100); // 100ms delay
                }
            } catch (error) {
                console.error(`❌ Failed to upload ${file.originalname}:`, error.message);
                errors.push({
                    fileName: file.originalname,
                    error: error.message
                });
                
                // If partial success is not allowed, stop on first error
                if (!allowPartialSuccess) {
                    throw new Error(`Upload failed for ${file.originalname}: ${error.message}`);
                }
            }
        }
        
        console.log(`Upload completed: ${results.length} successful, ${errors.length} failed`);
        
        return {
            successful: results,
            failed: errors,
            totalProcessed: files.length,
            successCount: results.length,
            failureCount: errors.length
        };
    } catch (error) {
        console.error('Error in uploadMultipleImagesWithPartialSuccess:', error);
        throw error;
    }
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate presigned URL for accessing S3 object
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
async function generatePresignedUrl(key, expiresIn = 3600) {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
            Expires: expiresIn
        };

        const url = await s3.getSignedUrlPromise('getObject', params);
        return url;
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        throw new Error('Failed to generate presigned URL');
    }
}

/**
 * Delete image from S3 bucket
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} Success status
 */
async function deleteImageFromS3(key) {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
        console.log('Image deleted from S3 successfully ✅');
        return true;
    } catch (error) {
        console.error('Error deleting from S3:', error);
        return false;
    }
}

export { 
    uploadImageToS3, 
    uploadMultipleImages, 
    uploadMultipleImagesWithPartialSuccess,
    formatBytes, 
    generatePresignedUrl,
    deleteImageFromS3 
};
