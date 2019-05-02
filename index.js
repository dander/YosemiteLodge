const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const moment = require("moment");

const startDate = process.argv[2] || "2019-05-24";
const emailCredential = process.argv[3] || "username:password";
const rangeStart = moment(startDate);
const rangeEnd = moment(rangeStart).add(40, "days");

const queryStart = rangeStart.format("ddd MMM D YYYY");
const queryEnd = rangeEnd.format("ddd MMM D YYYY");
const CHECK_INTERVAL = 30 * 3600 * 1000; // half hour
const LINK_URL = `https://reservations.ahlsmsworld.com/Yosemite/Search/GetInventoryCountData?callback=$.wxa.on_datepicker_general_availability_loaded&CresPropCode=000000&MultiPropCode=Y&UnitTypeCode=&StartDate=${queryStart}&EndDate=${queryEnd}&_=1556410207391`;
const RESPONE_TRIM_START = "$.wxa.on_datepicker_general_availability_loaded(";
const RESPONE_TRIM_END = ");";

let avaialbeDates = [];

const sendMail = async data => {
  const [username, password] = emailCredential.split(":");
  const transporter = nodemailer.createTransport({
    pool: true,
    host: "smtp.mail.yahoo.com",
    port: 465,
    secure: true,
    auth: {
      user: username, // generated ethereal user
      pass: password // generated ethereal password
    }
  });

  let info = await transporter.sendMail({
    from: "'someone' <someone@yahoo.com>", // sender address
    to: "someone@gmail.com", // list of receivers
    subject: "Yosemite Lodge Available", // Subject line
    text: data
      .map(lodge => `${lodge.DateKey} ${lodge.AvailableCount} available`)
      .join("\n"), // plain text body
    html: data
      .map(lodge => `<p>${lodge.DateKey} ${lodge.AvailableCount} available</p>`)
      .join("") // html body
  });

  console.log("Message sent: %s", info.messageId);
};

const checkLodge = async () => {
  const response = await fetch(LINK_URL);
  const responseText = await response.text();
  const responseJson = JSON.parse(
    responseText.slice(RESPONE_TRIM_START.length, -RESPONE_TRIM_END.length)
  );
  let newLodges = responseJson.filter(lodge => lodge.AvailableCount > 0);
  console.log("Available lodges", newLodges);
  newLodges = newLodges.filter((lodge, index) => {
    if (
      lodge.DateKey >= rangeStart.format("YYYY-MM-DD") &&
      lodge.DateKey <= rangeEnd.format("YYYY-MM-DD")
    ) {
      console.log("Found", lodge);
      return true;
    }
    return false;
  });
  console.log("Candidate lodges", newLodges, avaialbeDates);

  // different from our last search
  const isDifferent = newLodges.some(
    (lodge, index) =>
      !avaialbeDates[index] ||
      (lodge.AvailableCount !== avaialbeDates[index].AvailableCount ||
        lodge.DateKey !== avaialbeDates[index].DateKey)
  );

  if (isDifferent) {
    avaialbeDates = newLodges;
    console.log("Found available datas", avaialbeDates);
    await sendMail(avaialbeDates);
  } else {
    console.log("Unchanged result");
  }
};

setInterval(checkLodge, CHECK_INTERVAL);
checkLodge();
