import express from 'express';
import animeQuotes from '@kunwarji/anime-quotes';


const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));

// root route
app.get('/', (req, res) => {
   console.log(animeQuotes.randomQuoteByCharacter("Luffy"));
});



app.get('/character', async (req, res) => {
});

app.listen(3000, () => {
   console.log('server started');
});