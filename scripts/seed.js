// Run this script once to create the Admin account: node seed.js
const mongoose = require('mongoose');

// 👇 UPDATE THIS IF USING LOCALHOST OR ATLAS
const MONGODB_URI = "mongodb://admin:admin123@ac-nzerx24-shard-00-00.qhp2v7e.mongodb.net:27017,ac-nzerx24-shard-00-02.qhp2v7e.mongodb.net:27017,ac-nzerx24-shard-00-01.qhp2v7e.mongodb.net:27017/mvba-database?ssl=true&authSource=admin&retryWrites=true&w=majority";

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to DB");

    // Define Schema inline (simple hack for seed scripts)
    const AccountSchema = new mongoose.Schema({
      username: String, password: String, fullName: String, role: String
    });
    const Account = mongoose.models.Account || mongoose.model('Account', AccountSchema);

    // Create the Admin
    await Account.create({
      username: "admin",
      password: "password123", // Simple password for now
      fullName: "System Administrator",
      role: "Admin"
    });

    console.log("✅ Admin Account Created!");
    console.log("👤 User: admin");
    console.log("🔑 Pass: password123");

  } catch (err) {
    console.log(err);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();
