import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResoponse } from '../utils/ApiResponse.js';


const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation-  - not empty
    //check if user already exists: email, username
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    // create user object - create entry in db
    //remove password and refresh tokens field from response
    //check for user creation
    //return response

    const { fullName, email, username, password }= req.body
    console.log("req.body", req.body);
  // if(fullName === ""){
    //     throw new ApiError(400, "Full Name cannot be empty")
    // }
    if (
        [fullName, email, username, password].some((field) => 
        field?.trim()==="")//if it gets trimmed that means some returned answer as true for some of the fields or field and that means that field is empty
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
  
    if(!avatarLocalPath ){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, "avatar")
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "coverImage")

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //remove password and refresh tokens field from response
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResoponse(200, createdUser, "User registered Successfully")
    )

})  

export { registerUser }