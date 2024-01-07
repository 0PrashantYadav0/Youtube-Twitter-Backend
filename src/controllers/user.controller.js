import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asyncHandler( async (req, res) =>{
  const { fullname, email, username, password } = req.body
 
  if( 
    [ fullname, email, username, password ].some((field) => field?.trim() === "")
    )
  {
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
    $or : [{ username }, { email }]
  })
  if(existedUser){
    throw new ApiError(409,"User with email or username already exists")
  }

  const avatarLocalPath =  req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file does not exist")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!avatar){
    throw new ApiError(400, "Avatar file does not exist")
  }

  const user = await User.create({ 
    fullname,
    email,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    password,
    username: username.toLowerCase(),
  })


  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if(!createdUser){
    throw new ApiError(500, "something went wrong while creating user")
  }

  return res.status(200).json(
    new ApiResponse(200, createdUser, "user created successfully " )
  )

})


export { registerUser }