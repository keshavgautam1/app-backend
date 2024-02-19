import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResoponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';



const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (err) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResoponse(200, createdUser, "User registered Successfully")
    )

} ) 


const loginUser = asyncHandler(async (req, res) => {
    //req -> data 
    //username or email check
    //find user in db
    //check password
    //generate  refresh, access token
    //send cookies

    const {email, username, password} = req.body
    if(!(!email || !username)){
        throw new ApiError(400, "Please provide email or username")
    }
 
    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
    const options = {
        httpOnly: true, 
        secure: true 
    } //by doing this we are making sure that the cookie is not accessible but only visible from UI and can only be accessed by/from the server 
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResoponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
    
})


const logoutUser = asyncHandler(async (req, res) => {
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
        secure: true,
        expires: new Date(0) // Set the expiration date to a past time
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResoponse(200, {}, "User logged Out"));
});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request ")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
            );
           
            const user = await User.findById(decodedToken?._id);
            if(!user){
                throw new ApiError(401, "Invalid refresh token ")
            }
           
            if (incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(401, "Refresh token is expiredmor used")
            }

            const options = {
                httpOnly: true,
                secure: true
            };
    
            const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);

            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResoponse(
                    200,
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token refreshed successfully"
                )
            )
    } catch (err) {
        throw new ApiError(401, err?.message || "Invalid refresh token")
    }

});


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id) // req.user is the user object that we get from the middleware because user is loggedIn and middleware will be executed before this function so we will have the user object in req.user
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false})
    return res
    .status(200)
    .json(new ApiResoponse(200, {}, "Password changed successfully"))
});


const getCurrentUser = asyncHandler(async (req, res)=> {
    return res
    .status(200)
    .json(new ApiResoponse(200, req.user, "User details fetched successfully"))
})


const updateAccountDetails = asyncHandler( async(req, res)=>{
    const {fullName, email,} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email,
            }
        },
        {new:true}// it will return the updated document        
        
    ).select("-password")
    return res
    .status(200)
    .json (new ApiResoponse(200, user, "Account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is  missing")       
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Something went wrong while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResoponse(200, user, "Avatar image updated successfully")
        )
})


const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "cover image file is  missing")       
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Something went wrong while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResoponse(200, user, "Cover image updated successfully")
        )
})


const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions", // it is the name of the collection in the db we have given the name Subscription with capital S but in db it will be saved as subscriptions
                localField: "_id",
                foreignField: "channel", // from where you are getting this data //if we we look for channel wherever it is present among users then we will get the users who are subscribed to this channel (basically one to many relationship)
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions", 
                localField: "_id",
                foreignField: "subscriber", // if we look for subscriber wherever it is present in channels then we will get the channels to which this user is subscribed
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount:{
                    $size: "$subscribers" // it will give the count of the subscribers //use $ because it is a field in the document
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in:[req.user?._id, "$subscribers.subscriber"]}, // if the user is in the list of subscribers then it will return true else false
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    // read or console log what aggregate returns
    // console.log('Channel Data:', channel);
    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(new ApiResoponse(200, channel[0], "User channel profile fetched successfully"))
})


const getWatchHistory = asyncHandler(async(req, res)=>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id) // we are converting the string id to objectId because we are comparing it with objectId  
                // we are using mongoose because we are using mongoose types and we are using it to convert the string id to objectId 
                // we have to do it ths way and not directly req.user._id because we are using aggregate pipeline the code goes directly to the db so mongoose itself will not be able to convert the string id to objectId

            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner : {
                    $first: "$owner" // it will give the first element of the array owner 
                }
            }
        }
          
    ])

    return res
    .status(200)
    .json(
        new ApiResoponse(
            200, 
            user[0].watchHistory, 
            "Watch history fetched successfully"
            )
        )
})
    
 

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

 }

