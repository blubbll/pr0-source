// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express");
const app = express();

// our default array of dreams
const dreams = [
  "Find and count some sheep",
  "Climb a really tall mountain",
  "Wash the dishes"
];

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

//UPLOADING
const isUpload = req => {
  return (
    req.headers["user-agent"] ===
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36"
  );
};

const TEST = {
  file:
    "https://www.welt.de/img/wirtschaft/mobile149047426/5551624067-ci23x11-w1280/Lego-Schuhe-hergestellt-von-der-franzoesi-8.jpg",
  web:
    "https://www.welt.de/wirtschaft/article149047427/So-genial-ist-die-Idee-hinter-den-Lego-Schuhen.html"
};

app.get("/test", (req, res) => {
  console.debug(req.headers["user-agent"]);

  res.redirect(isUpload(req) ? TEST.file : TEST.web);
});

// send the default array of dreams to the webpage
app.get("/dreams", (request, response) => {
  // express helps us take JS objects and send them as JSON
  response.json(dreams);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
