const jwt=require("jsonwebtoken")
require("dotenv").config()
const {handleResponse} = require("../Responses/Responses")
const { User, Admin, Executive } = require("../Model/UserModel/UserModel")
const superAdminChecker = async (req, resp, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return handleResponse(resp, 401, "Token is required");

        const token = authHeader.split(" ")[1];
        const { id } = jwt.verify(token, process.env.JSON_SECRET_KEY);
        if (!id) return handleResponse(resp, 401, "Invalid token");

        const user = await User.findById(id).select("-password");
        if (!user) return handleResponse(resp, 401, "Unauthorized user");
        if(user?.role!=="Superadmin") return handleResponse(resp, 401, "Unauthorized user");

        req.user = user;
        next();
    } catch (error) {
        return handleResponse(resp, 401, "Invalid or expired token");
    }
}
const adminChecker = async (req, resp, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return handleResponse(resp, 401, "Token is required");

        const token = authHeader.split(" ")[1];
        const { id } = jwt.verify(token, process.env.JSON_SECRET_KEY);
        if (!id) return handleResponse(resp, 401, "Invalid token");

        const user = await Admin.findById(id).select("-password -privacyPassword -role");
        if (!user) return handleResponse(resp, 401, "Unauthorized user");

        req.user = user;
        next();
    } catch (error) {
        return handleResponse(resp, 401, "Invalid or expired token");
    }
}
const adminPrivacyChecker = async (req, resp, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return handleResponse(resp, 401, "Token is required");

        const token = authHeader.split(" ")[1];
        const { id,privacy } = jwt.verify(token, process.env.JSON_SECRET_KEY);
        if (!id) return handleResponse(resp, 401, "Invalid token");
        if (!privacy || privacy===false) return handleResponse(resp, 401, "Invalid token");

        const user = await Admin.findById(id).select("-password");
        if (!user) return handleResponse(resp, 401, "Unauthorized user");

        req.user = user;
        next();
    } catch (error) {
        return handleResponse(resp, 401, "Invalid or expired token");
    }
}
const executiveChecker = async (req, resp, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return handleResponse(resp, 401, "Token is required");

        const token = authHeader.split(" ")[1];
        const { id } = jwt.verify(token, process.env.JSON_SECRET_KEY);
        if (!id) return handleResponse(resp, 401, "Invalid token");

        const user = await Executive.findById(id).select("-password");
        if (!user) return handleResponse(resp, 401, "Unauthorized user");

        req.user = user;
        next();
    } catch (error) {
        return handleResponse(resp, 401, "Invalid or expired token");
    }
}
module.exports={superAdminChecker,adminChecker,adminPrivacyChecker,executiveChecker}