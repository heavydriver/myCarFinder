import axios from "axios";
import dotenv from "dotenv";
import * as fs from "node:fs";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const baseURL = `https://auto.dev/api/listings?apikey=${process.env.AUTO_DEV_API_KEY}&body_style[]=convertible&mileage=90000&price_max=25000&latitude=33.0198&longitude=-96.6989&radius=100&transmission[]=automatic`;
const telegramToken = process.env.TELEGRAM_API_KEY;

const getCarData = async (make, page, totalCount) => {
  try {
    const response =
      make != "all"
        ? await axios.get(`${baseURL}&make=${make}&page=${page}`)
        : await axios.get(`${baseURL}&page=${page}`);
    const data = response.data;

    totalCount += data.hitsCount;

    if (totalCount < data.totalCount) {
      data.records = data.records.concat(
        (await getCarData(make, page + 1, totalCount)).records
      );

      return data;
    } else {
      return data;
    }
  } catch (err) {
    console.log(err);
  }
};

const data = await getCarData("all", 1, 0);

const vinsFilePath = "vins.txt";
const myMakes = ["Lexus", "Mazda", "FIAT", "Infiniti"];

// data.records.map((record) => {
//   if (myMakes.includes(record.make)) {
//     console.log(
//       `${record.year} ${record.make} ${record.model} - ${record.price}`
//     );

//     fs.appendFileSync(
//       vinsFilePath,
//       fs.existsSync(vinsFilePath) ? `\n${record.vin}` : record.vin,
//       (err) => {
//         if (err) console.log(err);
//       }
//     );
//   }
// });

const vins = fs.readFileSync(vinsFilePath, "utf-8").split("\n");

const newRecords = [];

data.records.map((record) => {
  if (myMakes.includes(record.make) && !vins.includes(record.vin)) {
    fs.appendFileSync(vinsFilePath, `\n${record.vin}`, (err) => {
      if (err) console.log(err);
    });

    newRecords.push(record);
  }
});

const bot = new TelegramBot(telegramToken, { polling: false });
const chatId1 = process.env.MY_CHAT_ID_ONE;

// bot.on("message", (msg) => {
//   const chatId = msg.chat.id;

//   console.log(chatId);

//   // send a message to the chat acknowledging receipt of their message
//   bot.sendMessage(chatId, "Received your message");
// });

if (newRecords.length > 0) {
  // bot.sendMessage(chatId1, "New cars found");
  newRecords.map(async (record) => {
    try {
      await bot.sendPhoto(chatId1, record?.thumbnailUrlLarge);
    } catch (err) {
      console.log(err);
    }

    const message = `${record.year} ${record.make} ${record.model}\nPrice - ${record.price}\nMileage - ${record.mileage}\nDealer - ${record.dealerName}\nVin - ${record.vin}`;
    await bot.sendMessage(chatId1, message);
  });
} else {
  await bot.sendMessage(chatId1, "No new car(s) found");
}
