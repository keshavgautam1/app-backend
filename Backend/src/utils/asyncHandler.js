const asyncHandler =(requestHandler) => {
return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
    .catch((err) => next(err)) // if we have an error in the requestHandler function then we will pass the error to the next middleware function (error handler middleware function
    }
}



export {asyncHandler}






// const asyncHandler = () => {}
// const asyncHandler = (func) =>{ () => {}}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

// const asyncHandler = (fn) => async (req, res, next) => { //higher order function functions that takes a function as an argument and returns a function

//     try{
//         await fn(req, res, next)
//     } catch(err){
//         res.status(err.code || 500).json({
//             success:false,
//             message: err.message || "Internal Server Error"
//         })
//     }
// }
