const puppeteer = require("puppeteer");
const twilio = require("twilio");
const fs = require("fs");
const url = "https://jobs.lever.co/peteforamerica";

async function main() {
  console.log(process.env.twilioSID);
  console.log(process.env.twilioAuth);
  console.log(process.env.to);
  console.log(process.env.from);
  const twilioClient = new twilio(
    process.env.twilioSID,
    process.env.twilioAuth
  );
  let lastCheck;
  if (fs.statSync("./store.json")) {
    lastCheck = JSON.parse(fs.readFileSync("./store.json", "utf8"));
  }
  console.log("///////////////////////////////");
  console.log("///////////OLD JOBS////////////");
  console.log(lastCheck);
  /* Initiate the Puppeteer browser */
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  /* Go to the IMDB Movie page and wait for it to load */
  await page.goto(url, { waitUntil: "networkidle0" });
  /* Run javascript inside of the page */
  let data = await page.evaluate(() => {
    let length = document.querySelectorAll('div[class="posting"]').length;
    const titles = Array.from(
      document.querySelectorAll('div[class="posting"] > a > h5'),
      e => e.innerHTML
    );
    /* Returning an object filled with the scraped data */
    return {
      length,
      titles
    };
  });
  console.log("///////////////////////////////");
  console.log("///////////NEW JOBS////////////");
  console.log(data);
  await fs.writeFileSync("./store.json", JSON.stringify(data));
  if (
    lastCheck &&
    (lastCheck.length < data.length ||
      (lastCheck.length === data.length &&
        lastCheck.titles.toString() !== data.titles.toString()))
  ) {
    console.log("A job has been added or removed!");
    await twilioClient.messages
      .create({
        body: `ALERT: A new job has been added to Pete's campaign! Check it out at ${url}`,
        to: process.env.to, // Text this number
        from: process.env.from // From a valid Twilio number
      })
      .then(message => console.log(message.sid));
  } else {
    console.log("No new postings by number or title. Will not alert Lebage!");
  }
  await browser.close();
}

main();
