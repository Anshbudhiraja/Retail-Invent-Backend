const ExcelJS =require("exceljs")
const fs =require("fs")
const path = require("path")

const generateExcelReport=async (data,vendor)=> {
  try {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Ledger-Report")

  // Set column widths
  worksheet.columns = [
    { width: 12 }, // A - Date
    { width: 28 }, // B - Description
    { width: 15 }, // C - Debit
    { width: 15 }, // D - Credit
    { width: 15 }, // E - Balance
  ]

  let currentRow = 1

  // 1. Main Heading
  const mainHeading = worksheet.getCell(`A${currentRow}`)
  mainHeading.value = "LEDGER REPORT - " + vendor.title
  mainHeading.font = {
    size: 16,
    bold: true,
    color: { argb: "FF1F4E79" },
  }
  mainHeading.alignment = {
    horizontal: "center",
    vertical: "middle",
  }

  // Merge cells for main heading
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)

  // Add border and background to main heading
  const mainHeadingRange = worksheet.getCell(`A${currentRow}`)
  mainHeadingRange.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE7F3FF" },
  }
  mainHeadingRange.border = {
    top: { style: "thick", color: { argb: "FF1F4E79" } },
    left: { style: "thick", color: { argb: "FF1F4E79" } },
    bottom: { style: "thick", color: { argb: "FF1F4E79" } },
    right: { style: "thick", color: { argb: "FF1F4E79" } },
  }

  currentRow += 2 // Skip a row

  // 2. Report Information Section
  const reportInfo = [
    ["Vendor: ", vendor.name],
    ["Total Balance: ", `₹${vendor.balance}/-`]
  ]

  // vendor information
  const labelCell = worksheet.getCell(`A${currentRow}`)
  const valueCell = worksheet.getCell(`B${currentRow}`)

  labelCell.value = reportInfo[0][0]
  labelCell.font = { bold: true, size: 11 }

  valueCell.value = reportInfo[0][1]
  valueCell.font = { size: 11 }


  // total information
  const labelCell1 = worksheet.getCell(`D${currentRow}`)
  const valueCell1 = worksheet.getCell(`E${currentRow}`)

  labelCell1.value = reportInfo[1][0]
  labelCell1.font = { bold: true, size: 11 }

  valueCell1.value = reportInfo[1][1]
  valueCell1.font = { size: 11,bold:true,color:{argb:"FF008000"} }
  valueCell1.alignment={horizontal:"right"}

  currentRow += 2 // Skip rows before table

  // 4. Table Headers
  const headers = ["Date", "Description", "Debit(₹)", "Credit(₹)","Balance(₹)"]
  const headerRow = currentRow

  headers.forEach((header, index) => {
    const cell = worksheet.getCell(headerRow, index + 1)
    cell.value = header
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    }
  })

  currentRow++
  // 5. Data Rows
  data.forEach((record, index) => {
    const row = worksheet.getRow(currentRow)

    // Set values
    row.getCell(1).value = new Date(record.date).toLocaleDateString("en-GB",{day: "numeric",month: "long",year: "numeric"})
    row.getCell(2).value = record.description
    row.getCell(3).value = record.debit?`₹${record.debit.toFixed(2)}/-`:""
    row.getCell(4).value = record.credit?`₹${record.credit.toFixed(2)}/-`:""
    row.getCell(5).value = `₹${record.balance.toFixed(2)}/-`

    // Format balance cell
    const balanceCell = row.getCell(5)
    balanceCell.numFmt = "$#,##0.00"

    // Color negative balances red
    if (record.balance < 0) {
      balanceCell.font = { color: { argb: "FFFF0000" } }
    } else {
      balanceCell.font = { color: { argb: "FF008000" } }
    }

    // Alternate row colors
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8F9FA" },
        }
      })
    }

    // Add borders to all cells
    row.eachCell((cell,i) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      }
      if([3,4,5].includes(i)) cell.alignment = { vertical: "middle",horizontal:"right" }
      else cell.alignment = { vertical: "middle"}
    })

    currentRow++
  })

  currentRow += 2 // Skip rows after table

  // Auto-fit columns (optional)
  worksheet.columns.forEach((column) => {
    if (column.width < 10) {
      column.width = 15
    }
  })

  // Save the file
  const buffer = await workbook.xlsx.writeBuffer()

  // Create a directory for reports if it doesn't exist
  const reportsDir = path.join(__dirname,"..","..", "reports")
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }
  
  // Generate filename
  const filename=`${vendor.name}-ledger-${Date.now()}.xlsx`
  const outputPath = path.join(reportsDir, filename)

  // Write file to disk
  fs.writeFileSync(outputPath, buffer)
  return {status:true,message:"Excel report generated successfully!",data:{outputPath,filename}}
  } catch (error) {
    return {status:false,message:"Error occured in generating excel report."}
  }
}
module.exports=generateExcelReport