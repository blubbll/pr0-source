//copy by Blu, Kau, Nikei

const //imports
  express = require("express"),
  app = express(),
  fs = require("fs");

app.use(express.static("public"));

//UPLOADING
const isUpload = req => {
  return getType(req) === "upload";
};

const getType = req => {
  if (
    (req.headers["referer"] !== void 0 && req.protocol !== "https")
  ) {
    return "upload";
  }
  return "visit";
};

//todo: use actual mysql db for posts
const DB = {
  TEST1: {
    file:
      "https://www.welt.de/img/wirtschaft/mobile149047426/5551624067-ci23x11-w1280/Lego-Schuhe-hergestellt-von-der-franzoesi-8.jpg",
    web:
      "https://www.welt.de/wirtschaft/article149047427/So-genial-ist-die-Idee-hinter-den-Lego-Schuhen.html"
  },
  1588181276629: {
    file:
      "https://i.pinimg.com/originals/af/2e/50/af2e50f5458d5019831d53bc02634f0c.jpg",
    web: "https://www.deviantart.com/dlowell/art/Cmc-Matrix-527689606"
  },
  1588182495145: {
    file:
      "https://r4---sn-4g5e6nzz.googlevideo.com/videoplayback?expire=1588252615&ei=Z3uqXuTnM5mngAfj74WIDA&ip=24.134.59.13&id=o-AC2X59LBnGRR-ZzgMaGtMKFA1LbdAk7ibnpvQ1PZIq8F&itag=22&source=youtube&requiressl=yes&mh=C6&mm=31%2C26&mn=sn-4g5e6nzz%2Csn-5hne6nsr&ms=au%2Conr&mv=m&mvi=3&pl=18&initcwndbps=1327500&vprv=1&mime=video%2Fmp4&ratebypass=yes&dur=42.097&lmt=1577534065537890&mt=1588230931&fvip=4&c=WEB&txp=1306222&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cvprv%2Cmime%2Cratebypass%2Cdur%2Clmt&sig=AJpPlLswRAIgYUKVxUV41qj-r8CSI2PYz8MYFnxx8YyAFQCaBHkymXYCIA3UIDu5ZMS_ahaqoIbRpPQF_v_6pzNFQ4gzAtXNFEf5&lsparams=mh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Cinitcwndbps&lsig=ALrAebAwRQIhAKlZfNBAgutd8lCsV_Je0ouLc2RBV5ALz-Y0fTX-rVqrAiAuYLoqUlIirA6RSGFMgkLSw1T-fhYesqSxaOQA8RvTWQ%3D%3D&host=r4---sn-4g5e6nzz.googlevideo.com",
    web: "https://www.youtube.com/watch?v=5lcdSm6v5EA"
  },
  1588232765108: {
    file:
      "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/39da62f1-b049-4f7a-b10b-4cc5167cb9a2/ddmcfd6-308f2b47-0637-422a-a8a2-cb17a07dfe50.png/v1/fill/w_706,h_1000,q_80,strp/rainbow_dash_in_swimsuit_by_the_park_ddmcfd6-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTAwMCIsInBhdGgiOiJcL2ZcLzM5ZGE2MmYxLWIwNDktNGY3YS1iMTBiLTRjYzUxNjdjYjlhMlwvZGRtY2ZkNi0zMDhmMmI0Ny0wNjM3LTQyMmEtYThhMi1jYjE3YTA3ZGZlNTAucG5nIiwid2lkdGgiOiI8PTcwNiJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.sSX3lk1Ry9vUEm8dlehM5Edo0-tdapI0r3cpGZoek88",
    web:
      "https://www.deviantart.com/the-park/art/Rainbow-Dash-in-swimsuit-823591626"
  }
};

app.set("trust proxy", true);

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (req, res) => {
  res.write(fs.readFileSync(`${__dirname}/views/index.html`, "utf8")) &&
    res.end();
});

const log = req => {
  const _soos = +req.originalUrl.split("/")[1];

  console.debug({
    proto: JSON.parse(req.headers["cf-visitor"]).scheme,
    type: getType(req),
    IP: req.headers["cf-connecting-ip"]
      ? req.headers["cf-connecting-ip"]
      : req.ip,
    url: `${req.protocol}://${req.headers.host}${req.originalUrl}`,
    soos: _soos !== NaN ? _soos : 404
  });
};

app.post("/welcome", (req, res) => {
  //if(getType(req) === "visit" && isNaN(+req.originalUrl) && req.headers["cf-visitor"] && JSON.parse(req.headers["cf-visitor"]).scheme === "http"){ //upgrade cf directs
  //  res.redirect(`https://${req.headers.host}${req.originalUrl}`);
  //}
  log(req);
  res.json("yo")
});

//bongo
app.get("/*", (req, res, next) => {
  //if(getType(req) === "visit" && isNaN(+req.originalUrl) && req.headers["cf-visitor"] && JSON.parse(req.headers["cf-visitor"]).scheme === "http"){ //upgrade cf directs
  //  res.redirect(`https://${req.headers.host}${req.originalUrl}`);
  //}
  log(req);
  next();
});

//CONCEPT1
// ->/x
app.get("/test", (req, res) => {
  res.redirect(isUpload(req) ? DB.TEST1.file : DB.TEST1.web);
});

//CONCEPT2
//-> /soos?id=x
app.get("/soos", (req, res) => {
  const ID = req.query.id,
    ENTRY = DB[ID];
  ID && ENTRY
    ? [res.redirect(isUpload(req) ? DB[ID].file : DB[ID].web)]
    : res.status(404) && res.end();
});

//CONCEPT3
//-> /soos/x
app.get("/soos/:id", (req, res) => {
  const ID = req.params.id,
    ENTRY = DB[ID];
  ID && ENTRY
    ? [res.redirect(isUpload(req) ? DB[ID].file : DB[ID].web)]
    : res.status(404) && res.end();
});

//CONCEPT4 ✓
//-> /x
app.get("/:id", (req, res) => {
  const ID = req.params.id,
    ENTRY = DB[ID];
  ID && ENTRY
    ? [res.redirect(isUpload(req) ? DB[ID].file : DB[ID].web)] //link found, redirect to link
    : //entry not found, check if path is number...
      res.write(
        fs
          .readFileSync(`${__dirname}/views/index.html`, "utf8")
          .replace("{{from}}", `/${isNaN(+ID) ? 204 : 404}`) //if path is number but not found, notify client about 404, else about invalid serverside path
      ) && res.end();
});

app.get("/*", (req, res) => {
  res.write(
    fs
      .readFileSync(`${__dirname}/views/index.html`, "utf8")
      .replace("{{from}}", "/400") //how did we get here lol
  ) && res.end();
});

//save post
app.post("/", (req, res) => {
  console.log(req.query.token);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
