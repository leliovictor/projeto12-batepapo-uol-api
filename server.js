import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import joi from "joi";

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
  const { name } = req.body;

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
  const { user } = req.headers;
  const { to, text, type } = req.body;

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
        $or: [{ to: "Todos" }, { from: user }, { to: user }],
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
  const { user } = req.headers;

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

//SETINTERVAL PARA REMOVER INATIVO A CADA 15 SEG CRIAR A FUNCAO QUE FAZ E SÓ CHAMAR ou () =>

server.listen(5000);
