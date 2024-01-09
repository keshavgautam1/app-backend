import { Router } from 'express';
import {registerUser} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';


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


export default router;