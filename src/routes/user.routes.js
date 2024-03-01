import { Router } from "express";
import { loginUser, 
  logoutUser, 
  registerUser, 
  refreshAccessToken, 
  changeCurrentPassword, 
  getCurrentUser, 
  updateAccountDetails, 
  updateUserAvatar, 
  updateUserCoverImage, 
  getUserChannelProfile, 
  getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/register").post(
  upload.fields([
    {
      name : "avatar",
      maxCount : 1
    },
    {
      name : "coverImage",
      maxCount : 1
    }
  ]),
  registerUser
  )

router.route("/login").post(loginUser)

router.route("/logout").post(logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(changeCurrentPassword)
router.route("/current-user").get(getCurrentUser)
router.route("/update-account").patch(updateAccountDetails)
router.route("/avatar").post(upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").post(upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(getUserChannelProfile)
router.route("/history").post(getWatchHistory)

export default router;
