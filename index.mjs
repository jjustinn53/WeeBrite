import express from "express";
import animeQuotes from "@kunwarji/anime-quotes";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import session from "express-session";
import _ from "underscore";

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

app.set("trust proxy", 1);
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

//setting up database connection pool
const pool = mysql.createPool({
  host: "m7nj9dclezfq7ax1.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  user: "gre4j1gd6jvlnoii",
  password: "wx84emrijmcvzw8j",
  database: "lgcyr22okbejp03i",
  connectionLimit: 10,
  waitForConnections: true,
});

const NARUTO = [
  "Naruto",
  "Sasuke",
  "Itachi",
  "Jiraiya",
  "Might Guy",
  "Gaara",
  "Madara",
  "Kakashi",
  "Kiba Inuzuka",
  "Minato Namikaze",
];
const CHAINSAW = [
  "Himeno",
  "Aki Hayakawa",
  "Denji",
  "Makima",
  "Pochita",
  "Kobeni Higashiyama",
  "Power",
  "Kishibe",
  "Reze",
];
const BLEACH = [
  "Aizen Sousuke",
  "Ichigo Kurosaki",
  "Kenpachi Zaraki",
  "Shigekuni Yamamoto-Genryusai",
  "Zaraki Kenpachi",
  "Abarai Renji",
  "Kisuke Urahara",
  "Byakuya Kuchiki",
  "Mayuri Kurotsuchi",
  "Gin Ichimaru",
];

// Send authenticated data to browser
app.use((req, res, next) => {
  res.locals.authenticated = req.session?.authenticated || false;
  next();
});

// root route
app.get("/", (req, res) => {
  res.render("home.ejs");
  // console.log(animeQuotes.randomQuoteByCharacter("Luffy"));
});

//login route
app.get("/login", async (req, res) => {
  res.render("login.ejs", { message: "" });
});

app.post("/login", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  let passHash = "";

  let sql = `SELECT * 
              FROM users
              WHERE username = ?`;

//   const [data] = await pool.query(sql, [username]);
// TEST DELETE AFTER:
const [data] = await pool.query(sql, ['admin']);

  if (data.length > 0) {
    passHash = data[0].password;
  }

  const match = await bcrypt.compare(password, passHash);

//   if (match) {
    req.session.authenticated = true;
    req.session.userID = data[0].userID;
    res.render("home", { authenticated: true });
//   } else {
//     res.render("login", { authenticated: false });
//   }
});

// Logout Route
app.get("/logout", async (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/quiz", isAuthenticated, async (req, res) => {
  let questions = [];
  let correctIDs = [];
  for (let i = 0; i < 5; i++) {
   console.log('CORRECT IDs', correctIDs);
    let cor_sql = `SELECT c.* 
              FROM characters c
              LEFT JOIN userUnlock u ON u.character_id = c.character_id
              AND u.userID = ?
              WHERE (u.userID IS NULL OR u.unlocked = 0)`;

   if (correctIDs.length > 0) {
    cor_sql += ` AND c.character_id NOT IN (${correctIDs.map(() => '?').join(',')})`;
   }
   
   cor_sql += ` ORDER BY RAND() LIMIT 1;`;

    const [correct] = await pool.query(cor_sql, [req.session.userID, ...correctIDs]);


    if(correct.length == 0) {
      break;
    } 
    correctIDs.push(correct[0].character_id)

    let [firstName] = correct[0].name.split(" ");
    let quote = animeQuotes.randomQuoteByCharacter(firstName);
  
    let in_sql = `SELECT * FROM characters WHERE character_id NOT IN (?) ORDER BY RAND() LIMIT 3`;
    const [incorrect] = await pool.query(in_sql, [correct[0].character_id]);

    let options = [
            {name: incorrect[0].name, correct: false, character_id: incorrect[0].character_id},
            {name: incorrect[1].name, correct: false, character_id: incorrect[1].character_id},
            {name: incorrect[2].name, correct: false, character_id: incorrect[2].character_id},
            {name: correct[0].name, correct: true, character_id: correct[0].character_id}
         ]
   let shuffled = _.shuffle(options)
    questions.push(
      {
         question: quote.quote,
         answers: shuffled
      }
    )
  }

  res.render("quiz.ejs", { questions });
});

// Character Unlock Route
app.post('/quiz/unlocked', isAuthenticated, async (req, res) => {
   const user = req.session.userID;
   console.log(user);
   const { unlocked } = req.body;

   if(!user || !unlocked) {
      return res.json({ sucess: false })
   }

   try {
      for (let character of unlocked) {
         let sql = `INSERT INTO userUnlock(userID, character_id, unlocked)
                  VALUES (?, ?, 1)
                  ON DUPLICATE KEY UPDATE unlocked = 1`
         await pool.query(sql, [user, character]);
      }
      console.log("Successfully saved unlocked charactesr.")
   } catch (error) {
      console.log("Error saving characters: ", error)
   }
});
// Squad Builder Route
app.get("/squad", isAuthenticated, async (req, res) => {
  res.render("squad.ejs");
});

app.listen(3000, () => {
  console.log("server started");
});

//Middleware
function isAuthenticated(req, res, next) {
  if (!req.session.authenticated) {
    if (req.url !== "/login") {
      res.render("login", { message: "Please login to continue." });
    } else {
      res.render("login", { message: "asd" });
    }
  } else {
    next();
  }
}
