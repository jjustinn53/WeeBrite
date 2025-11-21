import express from 'express';
import animeQuotes from '@kunwarji/anime-quotes';


const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));

// root route
app.get('/', (req, res) => {
   const quote = animeQuotes.randomQuoteByCharacter("Luffy");
   console.log(quote);
   res.json(quote);
});

// login page route
app.get('/login', (req, res) => {
   res.render('login');
});

app.get('/character', async (req, res) => {
});

app.listen(3000, () => {
   console.log('server started');
});