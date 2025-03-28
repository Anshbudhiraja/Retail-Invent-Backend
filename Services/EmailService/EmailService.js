const nodemailer = require('nodemailer');
const { handleResponse } = require('../../Responses/Responses');
const { deleteOtp } = require('../OtpService/OtpService');
require("dotenv").config()
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVICE_EMAIL,
    pass: process.env.EMAIL_SERVICE_PASS
  }
})
const otpToSignIn=async(resp,name,email,otp)=>{   
    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Sign-In OTP</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                background: #ffffff;
                margin: 50px auto;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            h2 {
                color: #333;
            }
            p {
                color: #555;
                font-size: 16px;
            }
            .otp {
                font-size: 24px;
                font-weight: bold;
                color: #007BFF;
                background: #f1f1f1;
                padding: 10px;
                display: inline-block;
                margin: 20px 0;
                border-radius: 5px;
            }
            .button {
                display: inline-block;
                background-color: #007BFF;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 5px;
                font-size: 18px;
                font-weight: bold;
            }
            .footer {
                margin-top: 20px;
                font-size: 14px;
                color: #999;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🔐 Sign-In OTP for Your Account</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>To securely sign in to your account, please use the OTP below:</p>
            <div class="otp">${otp}</div>           
            <p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
            <p>If you didn’t request this, please ignore this email.</p>
            <div class="footer">
                <p>Best regards, <br><strong>Retail Invent</strong></p>
            </div>
        </div>
    </body>
    </html>`; 
    const mailOptions = {
      from: process.env.EMAIL_SERVICE_EMAIL,
      to: email,
      subject: `Your Sign-In OTP`,
      html:emailTemplate
    }
    try{
        const info = await transporter.sendMail(mailOptions);
        return handleResponse(resp,202,"OTP sent to your registered email",{status:true,required:"otp"});
    } catch (error) {
        deleteOtp(email)
        return handleResponse(resp,502,"Otp is not sent.Service Unavailable")
    }
}
const otpToCreateAccount=async(resp,name,email,otp)=>{    
   // HTML Email Template
   const emailTemplate = `
   <!DOCTYPE html>
   <html>
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1">
       <title>OTP Verification</title>
       <style>
           body {
               font-family: Arial, sans-serif;
               background-color: #f4f4f4;
               margin: 0;
               padding: 0;
           }
           .container {
               max-width: 600px;
               background: #ffffff;
               margin: 50px auto;
               padding: 20px;
               border-radius: 8px;
               box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
               text-align: center;
           }
           h2 {
               color: #333;
           }
           p {
               color: #555;
               font-size: 16px;
           }
           .otp {
               font-size: 24px;
               font-weight: bold;
               color: #007BFF;
               background: #f1f1f1;
               padding: 10px;
               display: inline-block;
               margin: 20px 0;
               border-radius: 5px;
           }
           .footer {
               margin-top: 20px;
               font-size: 14px;
               color: #999;
           }
       </style>
   </head>
   <body>
       <div class="container">
           <h2>🔐 Your OTP Code</h2>
           <p>Hello <strong>${name}</strong>,</p>
           <p>Your One-Time Password (OTP) is:</p>
           <div class="otp">${otp}</div>
           <p>This code is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
           <p>If you didn’t request this, please ignore this email.</p>
           <div class="footer">
               <p>Best regards, <br><strong>Retail Invent</strong></p>
           </div>
       </div>
   </body>
   </html>`;
  const mailOptions = {
    from: process.env.EMAIL_SERVICE_EMAIL,
    to: email,
    subject: "Your OTP Code for Verification",
    html:emailTemplate
  }
  try{
      const info = await transporter.sendMail(mailOptions);
      return handleResponse(resp,202,"OTP sent to your registered email",{status:true,required:"otp"});
  } catch (error) {
      deleteOtp(email)
      return handleResponse(resp,502,"Otp is not sent.Service Unavailable")
  }
}
const otpToResetAccount=async(resp,name,email,otp)=>{  
    const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reset Your Password</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                background: #ffffff;
                margin: 50px auto;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            h2 {
                color: #333;
            }
            p {
                color: #555;
                font-size: 16px;
            }
            .otp {
                font-size: 24px;
                font-weight: bold;
                color: #D9534F;
                background: #f1f1f1;
                padding: 10px;
                display: inline-block;
                margin: 20px 0;
                border-radius: 5px;
            }
            .button {
                display: inline-block;
                background-color: #D9534F;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 5px;
                font-size: 18px;
                font-weight: bold;
            }
            .footer {
                margin-top: 20px;
                font-size: 14px;
                color: #999;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🔑 Reset Your Password</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Use the OTP below to continue:</p>
            <div class="otp">${otp}</div>
            <p>This OTP is valid for <strong>5 minutes</strong>. If you didn't request a password reset, ignore this email.</p>
            <div class="footer">
                <p>Best regards, <br><strong>Retail Invent</strong></p>
            </div>
        </div>
    </body>
    </html>`;  
  const mailOptions = {
    from: process.env.EMAIL_SERVICE_EMAIL,
    to: email,
    subject: `Forgotten your Account Password?`,
    html:emailTemplate
  }
  try{
      const info = await transporter.sendMail(mailOptions);
      return handleResponse(resp,202,"OTP sent to your registered email",{status:true,required:"otp"});
  } catch (error) {
      deleteOtp(email)
      return handleResponse(resp,502,"Otp is not sent.Service Unavailable")
  }
}

module.exports={otpToSignIn,otpToCreateAccount,otpToResetAccount}