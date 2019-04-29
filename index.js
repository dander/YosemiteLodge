const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const moment = require('moment');

const startDate = process.argv[2] || '2019-05-24';
const rangeStart = moment(startDate);
const rangeEnd = moment(rangeStart).add(7, 'days');


const queryStart = rangeStart.format('ddd MMM D YYYY');
const queryEnd = rangeEnd.format('ddd MMM D YYYY');
const CHECK_INTERVAL = 30 * 3600 * 1000; // half hour
const LINK_URL = `https://reservations.ahlsmsworld.com/Yosemite/Search/GetInventoryCountData?callback=$.wxa.on_datepicker_general_availability_loaded&CresPropCode=000000&MultiPropCode=Y&UnitTypeCode=&StartDate=${queryStart}&EndDate=${queryEnd}&_=1556410207391`;
const RESPONE_TRIM_START = '$.wxa.on_datepicker_general_availability_loaded(';
const RESPONE_TRIM_END = ');';

const sendMail = async (data) => {
    let testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass // generated ethereal password
        }
    });

    let info = await transporter.sendMail({
        // from: '"Xiaoyu Zhang" <xiaoyuzh@gmail.com>', // sender address
        // to: "xiaoyuzh@gmail.com", // list of receivers
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: "bar@example.com, baz@example.com", // list of receivers
        subject: "Yosemite Lodge Available", // Subject line
        text: data.map((lodge) => `${lodge.DateKey} ${lodge.AvailableCount} available`).join('\n'), // plain text body
        html: data.map((lodge) => `<p>${lodge.DateKey} ${lodge.AvailableCount} available</p>`).join('') // html body
    });

    console.log("Message sent: %s", info.messageId);

    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

const checkLodge = async () => {
    let foundAvailableLodge = false;

    const response = await fetch(LINK_URL);
    const responseText = await response.text();
    const responseJson = JSON.parse(responseText.slice(RESPONE_TRIM_START.length, -RESPONE_TRIM_END.length));
    const avaialbeDates = responseJson.filter(lodge => lodge.AvailableCount > 0);
    avaialbeDates.forEach(lodge => {
        if (lodge.DateKey >= rangeStart.format('YYYY-MM-DD') && lodge.DateKey <= rangeEnd.format('YYYY-MM-DD')) {
            console.log('Found', lodge);
            foundAvailableLodge = true;
        }
    })

    if (foundAvailableLodge) {
        console.log('Found available datas', avaialbeDates);
        await sendMail(avaialbeDates);
        if (checkInterval) {
            clearInterval(checkInterval);
        }
    }
}

checkLodge();
const checkInterval = setInterval(checkLodge, CHECK_INTERVAL);