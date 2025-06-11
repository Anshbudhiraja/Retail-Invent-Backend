const puppeteer = require('puppeteer')

const renderHtml=(data,vendor)=>{
  const rows= data.map(obj=>`<tr>
    <td class="col-date">${new Date(obj.date).toLocaleDateString("en-GB",{day: "numeric",month: "long",year: "numeric"})}</td>
    <td class="col-desc desc-col">${obj.description}</td>
    <td class="col-dr nowrap">${obj.debit?`₹${obj.debit.toFixed(2)}`:''}</td>
    <td class="col-cr nowrap">${obj.credit?`₹${obj.credit.toFixed(2)}`:''}</td>
    <td class="col-bal nowrap">₹${obj.balance.toFixed(2)}</td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Ledger Report</title>
  <style>
    /* Ensure A4 size when printed */
    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: Arial, sans-serif;
      background-color: #fff;
      padding: 20mm;
      font-size: 10px;
      padding-top: 10mm;
    }

    h1 {
      text-align: center;
      font-size: 16px;
      margin-bottom: 20px;
    }
    
    h2{
        margin: 0%;
    }

    .table-container {
      overflow-x: auto;
    }
    .information{
        display: flex;
        justify-content: space-between;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #ccc;
    }

    thead {
      background-color: #2d3748; /* gray-800 */
      color: white;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 4px;
      text-align: center;
    }

    th {
      text-transform: uppercase;
      font-weight: 600;
    }

    td {
      color: #4a5568; /* gray-600 */
    }

    .desc-col {
      text-align: left;
      padding-left: 4px;
      word-wrap: break-word;
      white-space: normal;
    }

    .nowrap {
      white-space: nowrap;
    }

    /* Custom column widths */
    .col-date { width: 15%; }
    .col-desc { width: 35%; }
    .col-dr, .col-cr, .col-bal { width: 16.66%; }

    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>

  <h1>Ledger Report - ${vendor.title}</h1>

  <div class="table-container">
    <div class="information">
        <h2>Vendor:- ${vendor.name}</h2>
        <h2>Total Balance:- ₹${vendor.balance.toFixed(2)}/-</h2>
    </div>
    <table>
      <thead>
        <tr>
          <th class="col-date">Date</th>
          <th class="col-desc">Desc.</th>
          <th class="col-dr">Dr(₹)</th>
          <th class="col-cr">Cr(₹)</th>
          <th class="col-bal">Balance(₹)</th>
        </tr>
      </thead>
      <tbody>
        <!-- Sample static rows -->
        ${rows}
        <!-- Add more rows dynamically -->
      </tbody>
    </table>
  </div>
</body>
</html>`}
const convertPdf = async(data,vendor,outputFile) => {
  const htmlContent = renderHtml(data,vendor);
  if (!htmlContent) return { status: false, message: "No HTML content provided!" };
  let browser;
  try {
    browser = await puppeteer.launch({headless: 'new',args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    await page.pdf({path:outputFile,format:"A4", printBackground: true, margin: {top: '20mm',bottom: '20mm',left: '20mm',right: '20mm',}})
    return {status:true,message:"PDF created successfully!",file:outputFile}
  } catch (error) {
    return { status: false, message: "Error occurred in generating PDF!" }
  } finally {
    if (browser) await browser.close();
  }
}
module.exports=convertPdf;