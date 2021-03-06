import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import joi from "joi";
import { stripHtml } from "string-strip-html";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db = null;

mongoClient.connect().then(() => {
  db = mongoClient.db("UOL_API");
});

const server = express();
server.use(cors());
server.use(express.json());

const userSchema = joi.string().required();

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
});

server.post("/participants", async (req, res) => {
  const name = stripHtml(`${req.body.name}`).result.trim();

  const userValidation = userSchema.validate(name);
  if (userValidation.error) return res.sendStatus(422);

  try {
    const checkAlreadyOn = await db.collection("users").findOne({ name: name });
    if (checkAlreadyOn) return res.sendStatus(409);

    db.collection("users").insertOne({
      name: name,
      lastStatus: Date.now(),
    });

    db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });

    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

server.get("/participants", async (req, res) => {
  try {
    const users = await db.collection("users").find({}).toArray();
    res.send(users);
  } catch (error) {
    res.sendStatus(500);
  }
});

server.post("/messages", async (req, res) => {
  const user = stripHtml(`${req.headers.user}`).result.trim();
  const to = stripHtml(`${req.body.to}`).result.trim();
  const text = stripHtml(`${req.body.text}`).result.trim();
  const type = stripHtml(`${req.body.type}`).result.trim();

  try {
    const checkParticipantOn = await db
      .collection("users")
      .findOne({ name: user });
    const messageValidation = messageSchema.validate(req.body);
    if (!checkParticipantOn || messageValidation.error)
      return res.sendStatus(422);

    db.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });

    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

server.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const { user } = req.headers;
  try {
    let messages = await db
      .collection("messages")
      .find({
        $or: [
          { from: user },
          { to: user },
          { to: "Todos" },
          { type: "message" },
        ],
      })
      .toArray();

    if (limit) {
      messages = messages.slice(messages.length - limit, messages.length);
    }

    res.send(messages);
  } catch (error) {
    res.sendStatus(500);
  }
});

server.post("/status", async (req, res) => {
  const user = stripHtml(`${req.headers.user}`).result.trim();

  try {
    const findUser = await db.collection("users").findOne({ name: user });
    if (!findUser) return res.sendStatus(404);

    await db
      .collection("users")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

const TIME_15SEG = 15000;
setInterval(async () => {
  const allUsers = await db.collection("users").find({}).toArray();

  const refreshTime = Date.now();
  const TIME_10SEG = 10000;

  allUsers.map(async (userObject) => {
    if (refreshTime - userObject.lastStatus > TIME_10SEG) {
      await db.collection("users").deleteOne(userObject);

      await db.collection("messages").insertOne({
        from: userObject.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
    }
  });
}, TIME_15SEG);

server.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;

  const user = stripHtml(`${req.headers.user}`).result.trim();

  try {
    const findMessage = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });
    if (!findMessage) return res.sendStatus(404);
    if (findMessage.from !== user) return res.sendStatus(401);

    await db.collection("messages").deleteOne({ _id: new ObjectId(id) });

    res.sendStatus(202);
  } catch {
    res.sendStatus(500);
  }
});

server.put("/messages/:id", async (req, res) => {
  const { id } = req.params;

  const user = stripHtml(`${req.headers.user}`).result.trim();
  const to = stripHtml(`${req.body.to}`).result.trim();
  const text = stripHtml(`${req.body.text}`).result.trim();
  const type = stripHtml(`${req.body.type}`).result.trim();

  try {
    const checkParticipantOn = await db
      .collection("users")
      .findOne({ name: user });
    const messageValidation = messageSchema.validate(req.body);
    if (!checkParticipantOn || messageValidation.error)
      return res.sendStatus(422);

    const findMessage = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(id) });
    if (!findMessage) return res.sendStatus(404);
    if (findMessage.from !== user) return res.sendStatus(401);

    db.collection("messages").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          to,
          text,
          type,
          time: dayjs().format("HH:mm:ss"),
        },
      }
    );

    res.sendStatus(202);
  } catch {
    res.sendStatus(500);
  }
});

server.listen(5000);
