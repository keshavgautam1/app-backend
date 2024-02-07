import { Router } from 'express';
import {loginUser, logoutUser, registerUser, refreshAccessToken} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { varifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/register").post(
    upload.fields([//this upload is from multer it is a middleware and we are injecting it to this mathod just before exicuting registerUser mathod

        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(varifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router;