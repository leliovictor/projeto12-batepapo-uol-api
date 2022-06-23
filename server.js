import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

dotenv.config();

// time = dayjs().format('HH:mm:ss');

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db = null;

mongoClient.connect().then(() => {
	db = mongoClient.db("UOL_API");
});

const server = express();
server.use(cors());
server.use(express.json());

server.post("/participants",(req,res) => {
    const { name } = req.body;
    if(!name) return res.sendStatus(422);

    db.collection("UOL_API").insertOne({
        name: name,
        lastStatus: Date.now()
    });

    //Usar o try aqui e passar isso para um get ou checar como fazer validação
    console.log(db.collection("UOL_API").find().toArray().then(name => {
        console.log(name);
    }));

    res.send(name);
});

//SETINTERVAL PARA REMOVER INATIVO



server.listen(5000);