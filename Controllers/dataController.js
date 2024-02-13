const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { json } = require("express");

// Function to generate an array of random numbers between min (inclusive) and max (inclusive)
function getRandomNumbers(min, max, count) {
  const randomNumbers = [];
  const range = max - min + 1;
  for (let i = 0; i < count; i++) {
    const randomNumber = crypto.randomInt(range) + min;
    randomNumbers.push(randomNumber);
  }
  return randomNumbers;
}

async function scrapeTableData(postcodes) {
  const browser = await puppeteer.launch();
  const csvData = [];
  csvData.push({
    Postcode: "Postcode",
    "Property address": "Property address",
    "Energy rating": "Energy rating",
    "Valid until": "Valid until",
    "EPC Expired or not": "EPC Expired or not",
    Url: "Url",
  });

  for (let postcode of postcodes) {
    try {
      const page = await browser.newPage();
      await page.goto(
        `https://find-energy-certificate.service.gov.uk/find-a-certificate/search-by-postcode?postcode=${postcode}`
      );

      await page.waitForSelector(".govuk-table");

      const tableRows = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll(".govuk-table tr"));
        return rows.map((row) => {
          const property_address = Array.from(row.querySelectorAll("th")).map(
            (column) => column.textContent.trim()
          );
          const doc_link = Array.from(row.querySelectorAll("th a")).map(
            (column) => column.getAttribute("href")
          );
          const energy_rating_and_valid_until = Array.from(
            row.querySelectorAll("td")
          ).map((column) => column.textContent.trim());

          const valid_until = Array.from(row.querySelectorAll("td span")).map(
            (column) => column.textContent.trim()
          );
          const valid_until_exp = Array.from(
            row.querySelectorAll("td strong")
          ).map((column) => column.textContent.trim());

          return property_address
            .concat(
              "https://find-energy-certificate.service.gov.uk" + doc_link
            )
            .concat(energy_rating_and_valid_until)
            .concat(valid_until)
            .concat(valid_until_exp);
        });
      });

      for (let s = 1; s < tableRows.length; s++) {
        let is_valid = "";
        if (tableRows[s][5] == "EXPIRED") {
          is_valid = "EXPIRED";
        }

        csvData.push({
          Postcode: postcode,
          "Property address": tableRows[s][0],
          "Energy rating": tableRows[s][2],
          "Valid until": tableRows[s][4],
          "EPC Expired or not": is_valid,
          Url: tableRows[s][1],
        });
      }

      await page.close();
    } catch (error) {
      console.error("Error scraping data:", error);
    }
  }

  await browser.close();
  return csvData;
}

module.exports.fetchData = async function (Request, res) {
  try {
    const jsonObject = Request.body;
    const postcodes = Object.values(jsonObject);

    const csvData = await scrapeTableData(postcodes);

    const csvData3 = csvData.map(objectToCsvRow).join("\n");

    const randomNumber = getRandomNumbers(1, 100, 20);
    const folder_storage =
      "/var/www/html/ghe2/public/storage/epc_postcode/epc_post_" +
      randomNumber +
      ".csv";

      return res.json({ 'success':'1' ,'data':  csvData});

    // fs.writeFile(folder_storage, csvData3, (err) => {
    //   if (err) {
    //     console.error("Error writing CSV file:", err);
    //     return res.status(500).send("Internal Server Error");
    //   }
      

    // });
  } catch (error) {
    console.error("Error in fetchData:", error);
    res.status(500).send("Internal Server Error");
  }
};

function objectToCsvRow(obj) {
  const values = Object.values(obj);
  const csvRow = values.map((value) => `"${value}"`).join(",");
  return csvRow;
};
