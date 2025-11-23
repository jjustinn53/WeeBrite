import express from 'express';
import animeQuotes from '@kunwarji/anime-quotes';
import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt';
import session from 'express-session';

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1); 
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))


//setting up database connection pool
const pool = mysql.createPool({
  host: "m7nj9dclezfq7ax1.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
  user: "gre4j1gd6jvlnoii",
  password: "wx84emrijmcvzw8j",
  database: "lgcyr22okbejp03i",
  connectionLimit: 10,
  waitForConnections: true,
});

const NARUTO = ["Naruto", "Sasuke", "Itachi", "Jiraiya", "Might Guy", "Gaara", "Madara", "Kakashi", "Kiba Inuzuka", "Minato Namikaze"] 
const CHAINSAW = ["Himeno", "Aki Hayakawa", "Denji", "Makima", "Pochita", "Kobeni Higashiyama", "Power", "Kishibe", "Reze"]
const BLEACH = ["Aizen Sousuke", "Ichigo Kurosaki", "Kenpachi Zaraki", "Shigekuni Yamamoto-Genryusai", "Zaraki Kenpachi", "Abarai Renji", "Kisuke Urahara", "Byakuya Kuchiki", "Mayuri Kurotsuchi", "Gin Ichimaru"]

// root route
app.get('/', (req, res) => {
   res.render('home.ejs')
   // console.log(animeQuotes.randomQuoteByCharacter("Luffy"));
});



app.get('/quiz', async (req, res) => {
   let sql = `SELECT * FROM characters ORDER BY RAND() LIMIT 1`
   
   const [correct] = await pool.query(sql)

   let in_sql = `SELECT * FROM characters WHERE id != ? ORDER BY RAND() LIMIT 3`
   const [incorrect] = await pool.query(in_sql, [correct.id])
   res.render('quiz.ejs')
});

//login route
app.get('/login', async (req, res) => {
   res.render('login.ejs')
});

app.post('/login', async (req, res) => {
   let username = req.body.username;
   let password = req.body.password;

   let passHash = "";
   
   let sql = `SELECT * 
              FROM users
              WHERE username = ?`

   const [data] = await pool.query(sql, [username])
   if(data.length > 0) {
      passHash = data[0].password;
   }

   const match = await bcrypt.compare(password, passHash);
   
   if(match) {
      req.session.authenticated = true;
      res.render('home')
   } else {
      res.render('login')
   }
});

// Squad Builder Route
app.get('/squad', async (req, res) => {
   console.log(req.session.authenticated);
   if(req.session.authenticated) {
      res.render('squad.ejs')
   } else {
      res.render('home')
   }
});

app.listen(3000, () => {
   console.log('server started');
});