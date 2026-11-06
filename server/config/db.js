const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas.
 * MONGO_URI is the Atlas connection string, e.g.
 *   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/spendwise?retryWrites=true&w=majority
 * (Remember to add your IP in Atlas > Network Access, and URL-encode special characters in the password.)
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined. Paste your MongoDB Atlas connection string into server/.env');
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) throw new Error('MONGO_URI must start with mongodb+srv:// (Atlas) or mongodb://');
  if (/<password>|<db_password>|<username>/.test(uri)) {
    throw new Error('MONGO_URI still contains the <password> placeholder. Replace it with your Atlas database user password.');
  }

  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // fail fast with a clear message instead of hanging
      maxPoolSize: 10,
    });
    console.log(`MongoDB Atlas connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    const hint = /ENOTFOUND|querySrv|ECONNREFUSED|timed out|Server selection/i.test(err.message)
      ? ' Check the cluster hostname and that your IP address is allowed in Atlas > Network Access.'
      : /auth/i.test(err.message) ? ' Check the database username and password in MONGO_URI.' : '';
    throw new Error(`${err.message}${hint}`);
  }
};

module.exports = connectDB;
