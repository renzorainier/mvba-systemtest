// reveal_url.js
const dns = require('dns');

// 1. Force Google DNS (Since this works on your machine)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const srvAddress = '_mongodb._tcp.database.qhp2v7e.mongodb.net';

console.log("🔍 Looking up the hidden addresses for your cluster...");

dns.resolveSrv(srvAddress, (err, addresses) => {
    if (err) {
        console.error("❌ Lookup failed:", err);
        return;
    }

    console.log("✅ FOUND THEM! Here is your 'Long String':\n");

    // Construct the standard string
    const hosts = addresses.map(a => `${a.name}:${a.port}`).join(',');
    
    // 👇 THIS IS THE STRING YOU NEED
    const longString = `mongodb://admin:admin123@${hosts}/mvba-database?ssl=true&authSource=admin&retryWrites=true&w=majority`;
    
    console.log(longString);
    console.log("\n👉 Copy the string above and paste it into lib/mongodb.js");
});