import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db = null;

mongoClient.connect().then(() => {
  db = mongoClient.db("UOL_API");
});

const server = express();
server.use(cors());
server.use(express.json());

server.post("/participants", (req, res) => {
  const { name } = req.body;
  if (!name) return res.sendStatus(422);
  //VALIDAÇÂO AQUI SERÀ FEITA COM JOI, AINDA ENSINARÀ

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
});

server.get("/participants", async (req, res) => {
  try {
    const users = await db.collection("users").find({}).toArray();
    res.send(users);
  } catch (error) {
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

//SETINTERVAL PARA REMOVER INATIVO

server.listen(5000);
