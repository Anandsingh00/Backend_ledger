const mongoose = require("mongoose");

async function connectToDB() {
  // console.log(process.env.MONGO_URI)
  await mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log(`Server is Connected to DB`);
    })
    .catch((err) => {
      console.log(`Error while connecting to DB: ${err}`);
      process.exit(1);
    });
}

module.exports = connectToDB;
