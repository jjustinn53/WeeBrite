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

// Send authenticated data to browser
app.use((req, res, next) => {
  res.locals.authenticated = req.session?.authenticated || false;
  res.locals.error = null;
  next();
});

// root route
app.get("/", async (req, res) => {
  try {
    // Fetch 3 random featured characters
    let sql = `SELECT * FROM characters ORDER BY RAND() LIMIT 3`;
    const [featuredCharacters] = await pool.query(sql);
    
    res.render("home.ejs", { 
      featuredCharacters,
      authenticated: req.session?.authenticated || false 
    });
  } catch (error) {
    console.error("Error fetching featured characters:", error);
    res.render("home.ejs", { 
      featuredCharacters: [],
      authenticated: req.session?.authenticated || false 
    });
  }
});

// Search Characters Route
app.get("/search", async (req, res) => {
  const searchQuery = req.query.q;

  if (!searchQuery || searchQuery.trim() === "") {
    res.redirect("/");
    return;
  }

  try {
    let sql = `SELECT * FROM characters WHERE name LIKE ? OR character_id LIKE ?`;
    const [results] = await pool.query(sql, [`%${searchQuery}%`, `%${searchQuery}%`]);

    res.render("search-results.ejs", { results, searchQuery, error: null });
  } catch (error) {
    console.error("Search error:", error);
    res.render("search-results.ejs", { results: [], searchQuery, error: "Error searching characters" });
  }
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

  const [data] = await pool.query(sql, [username]);

  if (data.length > 0) {
    passHash = data[0].password;
  }

  const match = await bcrypt.compare(password, passHash);

  if (match) {
    req.session.authenticated = true;
    req.session.userID = data[0].userID;
    
    try {
      let sql = `SELECT * FROM characters ORDER BY RAND() LIMIT 3`;
      const [featuredCharacters] = await pool.query(sql);
      res.render("home.ejs", { 
        authenticated: true,
        featuredCharacters 
      });
    } catch (error) {
      console.error("Error fetching featured characters:", error);
      res.render("home.ejs", { 
        authenticated: true,
        featuredCharacters: [] 
      });
    }
  } else {
    res.render("login.ejs", { message: "Invalid username or password." });
  }
});

// Signup Routes
app.get("/signup", async (req, res) => {
  res.render("signup.ejs", { message: "" });
});

app.post("/signup", async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  // Check if username already exists
  let checkSql = `SELECT * FROM users WHERE username = ?`;
  const [existing] = await pool.query(checkSql, [username]);

  if (existing.length > 0) {
    res.render("signup.ejs", { message: "Username already exists. Please choose another." });
    return;
  }

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Insert new user
  let insertSql = `INSERT INTO users (username, password) VALUES (?, ?)`;
  await pool.query(insertSql, [username, hashedPassword]);

  // Log the user in automatically
  const [newUser] = await pool.query(checkSql, [username]);
  req.session.authenticated = true;
  req.session.userID = newUser[0].userID;
  
  res.redirect("/");
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
            {name: correct[0].name, correct: true, character_id: correct[0].character_id, image: correct[0].image_url}
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
   let sql = `SELECT * FROM characters c
            LEFT JOIN userUnlock u ON c.character_id = u.character_id
            WHERE u.userID = ?`;

   const [unlocked] = await pool.query(sql, [req.session.userID]);

   let squad_sql = `SELECT * FROM characters c
            INNER JOIN squad s ON s.character_id = c.character_id
            WHERE s.userID = ?` 
   const [cur_squad] = await pool.query(squad_sql, [req.session.userID])

   console.log('UNLOCK:', unlocked);

  res.render("squad.ejs", {unlocked, cur_squad});
});

app.listen(3000, () => {
  console.log("server started");
});

// Character Save Route
app.post('/squad/save', isAuthenticated, async (req, res) => {
   const user = req.session.userID;
   console.log(user);
   const { squad } = req.body;


   if(!user || !squad) {
      return res.json({ sucess: false })
   }

   try {

      if(squad.length > 0) {
         await pool.query(`DELETE FROM squad WHERE userID = ? AND character_id NOT IN (${squad.map(() => '?').join(',')})`, [user, ...squad])
      
         const values = squad.map((characterId) => [user, characterId]);
         let sql = `INSERT IGNORE INTO squad(userID, character_id)
                  VALUES ?`
         await pool.query(sql, [values]);
      } else {
         await pool.query(`DELETE FROM squad WHERE userID = ?`, [user]);
      }

      console.log("Successfully saved squad.")
   } catch (error) {
      console.log("Error saving squad: ", error)
   }
});

//Middleware
function isAuthenticated(req, res, next) {
  if (!req.session.authenticated) {
    if (req.url !== "/login") {
      res.render("login.ejs", { message: "Please login to continue." });
    } else {
      res.render("login.ejs", { message: "" });
    }
  } else {
    next();
  }
}

app.listen(3000, () => {
  console.log("server started");
});
