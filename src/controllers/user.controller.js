import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import jwt from 'jsonwebtoken';
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose, { mongo } from 'mongoose';


const generateAccessAndRefreshToken = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken
    user.save({ validateBeforeSave: false })

    return { accessToken , refreshToken }

  } catch (error) {
    throw new ApiError(500, "Error generating access token")
  }
}


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
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

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

const loginUser = asyncHandler(async (req, res) => {
  const {username, email, password } = req.body

  if(!username && !email ){
    throw new ApiError(400,"username or email is required")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if(!user){
    throw new ApiError(400,"user not found")
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid){
    throw new ApiError(400,"password is not correct")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        loggedInUser,
        accessToken,
        refreshToken
      },
      "User logged in Successfully"
    )
  ) 

})


const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
      req.user._id,
      {
          $unset: {
              refreshToken: 1 // this removes the field from document
          }
      },
      {
          new: true
      }
  )

  const options = {
      httpOnly: true,
      secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized access")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "resfresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken : newRefreshToken},
        "Access token refreshed successfully"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if(!isPasswordCorrect) {
    throw new ApiError(400, "invalid password" )
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false})

  return res.status(200).json(new ApiResponse(200, {}, "New password updated successfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "current user fetched successfully"))
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullname, email} = req.body

  if(!fullname || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      }
    },
    {new: true}
  ).select("-password")

  return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file not found")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url) {
    throw new ApiError(400, "Avatar is not uploaded")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { 
      $set: 
      {
        avatar: avatar.url
      }
    },
    {new:true}
  ).select("-password")

  return res.status(200).json(
    new ApiResponse(200,user, "avatar updated successfully")
  )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path

  if(!coverLocalPath) {
    throw new ApiError(400, "coverImage file not found")
  }

  const coverImage = await uploadOnCloudinary(avatarLocalPath)

  if(!coverImage.url) {
    throw new ApiError(400, "Cover image is not uploaded")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { 
      $set: 
      {
        coverImage: avatar.url
      }
    },
    {new:true}
  ).select("-password")

  return res.status(200).json(
    new ApiResponse(200,user, "coverimage updated successfully")
  )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if(!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size : "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed : {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1, 
        avatar: 1, 
        coverImage: 1,
        email: 1,
        createdAt: 1,
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404, "channel does not exist")
  }

  return res.status(200).json(new ApiResponse(200, channel[0], "user channedl fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      },
    },
    {
      $lookup :{
        from: "videos",
        localFields: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup:{
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username : 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields :{
              owner: {
                $first : "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully"))
})

export { registerUser, 
  loginUser, 
  logoutUser, 
  refreshAccessToken, 
  updateUserAvatar, 
  updateAccountDetails, 
  getCurrentUser, 
  changeCurrentPassword, 
  updateUserCoverImage, 
  getUserChannelProfile, 
  getWatchHistory
 }

 