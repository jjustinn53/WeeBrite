import express from 'express';
import animeQuotes from '@kunwarji/anime-quotes';


const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));


const NARUTO = ["Naruto", "Sasuke", "Itachi", "Jiraiya", "Might Guy", "Gaara", "Madara", "Kakashi", "Kiba Inuzuka", "Minato Namikaze"] 
const CHAINSAW = ["Himeno", "Aki Hayakawa", "Denji", "Makima", "Pochita", "Kobeni Higashiyama", "Power", "Kishibe", "Reze"]
const BLEACH = ["Aizen Sousuke", "Ichigo Kurosaki", "Kenpachi Zaraki", "Shigekuni Yamamoto-Genryusai", "Zaraki Kenpachi", "Abarai Renji", "Kisuke Urahara", "Byakuya Kuchiki", "Mayuri Kurotsuchi", "Gin Ichimaru"]

// root route
app.get('/', (req, res) => {
   res.render('home.ejs')
   console.log(animeQuotes.randomQuoteByCharacter("Luffy"));
});



app.get('/character', async (req, res) => {
});

app.listen(3000, () => {
   console.log('server started');
});