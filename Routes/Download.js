const express = require("express");
require("dotenv").config()
const { handleResponse }=require("../Responses/Responses");
const { adminChecker } = require("../Middlewares/Checkuserdetails");
const FileController = require("../Controller/AdminController/FileController/FileController");
const Routes = express.Router();
Routes.get("/", async (req, resp) =>handleResponse(resp,202,"Server Health is Okay"))

// 1. Current Month Excel
Routes.get('/excel/current-month/:vendorId',adminChecker,FileController.excel_current_month);

// 2. Current Month PDF
Routes.get('/pdf/current-month/:vendorId',adminChecker,FileController.pdf_current_month);

// 3. Financial Year Excel
Routes.get('/excel/financial-year/:vendorId',adminChecker,FileController.excel_financial_year);

// 4. Financial Year PDF
Routes.get('/pdf/financial-year/:vendorId',adminChecker,FileController.pdf_financial_year);
module.exports = Routes;