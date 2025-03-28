const crypto = require("crypto");

const otpMap = new Map();
const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

const generateOtp = (email) => {
    email = email.toLowerCase();
    const number = crypto.randomInt(0, 1000000);
    const otp = String(number).padStart(6, "0");
    const expiry = Date.now() + OTP_EXPIRY_TIME;
    otpMap.set(email, { otp, expiry });

    setTimeout(() => {
        const otpEntry = otpMap.get(email);
        if(otpEntry) otpMap.delete(email);
    }, OTP_EXPIRY_TIME);
    
    return otp;
};

const verifyOtp = (email, otp) => {
    email = email.toLowerCase();
    const otpEntry = otpMap.get(email);

    if (!otpEntry) {
        return { status: false, message: "OTP not found or expired" };
    }

    if (Date.now() > otpEntry.expiry) {
        otpMap.delete(email);
        return { status: false, message: "OTP expired" };
    }

    if (otpEntry.otp === otp) {
        otpMap.delete(email);
        return { status: true, message: "OTP verified successfully" };
    }

    return { status: false, message: "Invalid OTP" };
};

const deleteOtp = (email) => {
    email = email.toLowerCase();
    const otpEntry = otpMap.get(email);
    if(otpEntry) otpMap.delete(email);
};

module.exports = { generateOtp, verifyOtp, deleteOtp };