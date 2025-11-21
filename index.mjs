import express from 'express';
import animeQuotes from '@kunwarji/anime-quotes';


const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));

// root route
app.get('/', async (req, res) => {
   console.log(animeQuotes.randomQuoteByCharacter("Luffy"));
   res.render('home.ejs');
});



app.get('/character', async (req, res) => {
   const characterName = req.query.name;
   try {
      const quoteData = await animeQuotes.randomQuoteByCharacter(characterName);
      res.render('character.ejs', { quote: quoteData });
   } catch (error) {
      res.render('character.ejs', { quote: null, error: 'Character not found or no quotes available.' });
   }
});

app.listen(3000, () => {
   console.log('server started');
});