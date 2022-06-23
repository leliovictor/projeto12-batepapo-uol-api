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
    time: dayjs().format('HH:mm:ss')
  });

  res.sendStatus(201);
});

server.get("/participants",(req,res)=>{
    res.send('ok');
});


//SETINTERVAL PARA REMOVER INATIVO

server.listen(5000);
