import fs from "fs";

import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret:process.env.CLOUDINARY_SECRET  
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if(!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath,{
      resource_type: "auto"
    })
    fs.unlinkSync(localFilePath);
    return response
  } catch (error) {
      fs.unlinkSync(localFilePath) //remove local file save on system
      return null;
  }
}

export { uploadOnCloudinary }