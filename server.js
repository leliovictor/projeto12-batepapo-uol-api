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

const userSchema = joi.object({
  name: joi.string().required(),
});

//mudar para message Schema
const messageSchema = joi.object({
  from: joi.string().required(),
  to: joi.number().required(),
  text: joi.string().email().required(),
  type: joi.string().email().required(),
});

server.post("/participants", async (req, res) => {
  const userValidation = userSchema.validate(req.body);
  if (userValidation.error) return res.sendStatus(422);

  const { name } = req.body;

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

server.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  db.collection("messages").insertOne({
    from: user,
    to,
    text,
    type,
    time: dayjs().format("HH:mm:ss"),
  });

  res.sendStatus(201);
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

server.post("/status", (req, res) => {});

//SETINTERVAL PARA REMOVER INATIVO

server.listen(5000);
