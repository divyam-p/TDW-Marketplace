const express = require("express");
const mongoose = require("mongoose");
const app = express();
const { google } = require("googleapis");
const cors = require("cors");
app.use(cors());

require("dotenv").config();

const bodyParser = require("body-parser");
app.use(bodyParser.json());

const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");

const Queue = require("bull");

const serviceAccount = require("./firebase-admin.json");

let Product = require("./models/product.model");

const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  ""
);

const uri = process.env.ATLAS_URI;

//setting up database
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("MongoDb Connected successfully");
});

const productsRouter = require("./routes/products");
app.use("/products", productsRouter);

//for oauth
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://team-tdw-default-rtdb.firebaseio.com",
});

// middleware to verify request from frontend are from a registered firstbase user
const verifyFirebaseTokenMiddleware = (req, res, next) => {
  let authToken = req.headers["authorization"];
  if (authToken) {
    authToken = authToken.replace("Bearer ", "");
    getAuth()
      .verifyIdToken(authToken)
      .then((decodedToken) => {
        req.uid = decodedToken.uid;
        req.authToken = authToken;
        next();
      })
      .catch((error) => {
        return res.status(404).json({ error: "User not found with token" });
      });
  } else {
    return res.status(401).json({ error: "No authorization token provided" });
  }
};

const http = require("http");
const PORT = process.env.PORT || 5000;

server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: process.env.SOCKET_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(function (req, res, next) {
  console.log("HTTP request", req.method, req.url, req.body);
  next();
});

const sendCalendar = new Queue(
  "send google calendar",
  process.env.REDIS_URL
);

sendCalendar.process(async (job, done) => {
  googleOAuth2Client.setCredentials({ refresh_token: job.data.refreshToken });
  const listing = job.data.listing;
  try {
    googleResponse = await google.calendar("v3").events.insert({
      auth: googleOAuth2Client,
      calendarId: "primary",
      requestBody: {
        start: {
          dateTime: new Date(listing.biddingDate),
        },
        end: {
          dateTime: new Date(
            new Date(listing.biddingDate).getTime() + 60 * 60 * 1000
          ),
        },
        description: `${listing.description}, starting bid ${listing.startingBid}`,
        summary: `${listing.name}'s auction event`,
      },
    });
    if (googleResponse.status === 200) {
      // calendar event created
      done();
    } else {
      retry();
    }
  } catch (err) {
    retry();
  }
  done();
});

app.get("/", async function (req, res, next) {
  res.json(req.body);
  next();
});

app.post(
  "/api/tasks/listings/:listing_id/google_calendar",
  async function (req, res, next) {
    let authToken = req.headers["authorization"];
    if (!authToken) {
      return res.status(401).json({ error: "No authorization token provided" });
    }
    if (!authToken.startsWith("Bearer ")) {
      return res
        .status(409)
        .json({ error: "Authorization is not a bearer token" });
    }
    const listingId = req.params.listing_id;

    let product = null;
    try {
      product = await Product.findOne({ _id: listingId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    authToken = authToken.replace("Bearer ", "");
    sendCalendar.add(
      { refreshToken: authToken, listing: product },
      { attempts: 3, backoff: 10000, delay: 10000 }
    );
    res.status(200).json({ status: "scheduled creation for calendar event" });
  }
);

let auctionToUser = {};

let userToAuction = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", (auctionId) => {
    console.log("connected", socket.id); 
    if (!auctionToUser[auctionId]) {
      auctionToUser[auctionId] = [];
    }
    const maxConnections = 10;
    if (auctionToUser[auctionId].length >= maxConnections) {
      return socket.emit("auctionFull");
    }
    let checkIfSocketPresent = false; 
    auctionToUser[auctionId].forEach((socketId) => { 
      if (socketId === socket.id) { 
        checkIfSocketPresent = true; 
      }
    })
    if (!checkIfSocketPresent) { 
      auctionToUser[auctionId].push(socket.id);
    }
    //TODO: what if user present in another room! 
    userToAuction[socket.id] = auctionId;
    const otherUsersInAuction = auctionToUser[auctionId].filter(
      (userId) => userId !== socket.id
    );

    console.log("auctionToUser", auctionToUser); 
    console.log("userToAuction", userToAuction); 
    socket.emit("otherUsersInAuction", otherUsersInAuction);
  });

  socket.on("sendingSignal", (data) => {
    io.to(data.userToSignal).emit("userJoinedAuction", {
      signal: data.signal,
      userJoined: data.userJoined,
    });
  });

  socket.on("receivedSignal", (data) => {
    io.to(data.userJoined).emit("gotSignal", {
      signal: data.signal,
      id: socket.id,
    });
  });

  socket.on("disconnectAll", (data) => { 
    const user = auctionToUser[data.auctionId]; 
    user.forEach((socketId) => { 
      io.to(socketId).emit("disconnectPeers");
    })
  })

  socket.on("disconnect", () => {
    console.log("disconnected", socket.id); 
    const auctionId = userToAuction[socket.id];
    delete userToAuction[socket.id];
    let users = auctionToUser[auctionId];
    const userIndex = users ? users.indexOf(socket.id) : -1;
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
      auctionToUser[auctionId] = users;
      users.forEach((socketId) => {
        io.to(socketId).emit("userDisconnected", {
          id: socket.id,
        });
      });
    }
  });

});

server.listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});
