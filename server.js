//copy by Blu, Kau & Nikei

const //imports
  express = require("express"),
  app = express(),
  fs = require("fs"),
  $ = require("node-global-storage"),
  mySqlEasier = require("mysql-easier"),
  sqlstring = require("sqlstring"),
  matomo = require("matomo-tracker"),
  fsExtra = require("fs-extra"),
  fetch = require("node-fetch");

app.use(express.static("public"));

let m = new matomo(process.env.MATOMO_ID, process.env.MATOMO_INSTANCE);

const mysqape = input => {
  if (!isNaN(input)) return sqlstring.escape(input);
  else
    return sqlstring
      .escape(input)
      .substring(1)
      .slice(0, -1);
};

//tmp uplaod dir
{
  const dir = `${__dirname}/tmp`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  } else {
    fsExtra.emptyDirSync(dir);
  }
}

//UPLOADING
const isUpload = req => {
  return getType(req) === "upload";
};
//SELFINFO
const isSelf = req => {
  return getType(req) === "self";
};

const getType = req => {
  //self-preflight
  if (req.headers["self"] !== void 0 && req.headers["self"] == "true") {
    return "self";
  }
  if (req.method === "HEAD") return "navigation";
  //uploader
  if (
    req.headers["cf-connecting-ip"] === process.env.PR0IP &&
    req.headers["user-agent"] === process.env.PR0AGENT &&
    req.protocol === "https"
  ) {
    return "upload";
  }
  //first ping
  if (req.originalUrl.split("/")[1] === "welcome") return "app_open";
  //direct on source
  if (+req.originalUrl.split("/")[1]) return "visit_source";
  //general visit
  return "visit";
};

//try to get real ip
app.set("trust proxy", true);

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ limit: "33mb", extended: true }));

// Parse JSON bodies (as sent by API clients)
app.use(express.json({ limit: "33mb", extended: true }));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (req, res) => {
  res.write(
    fs
      .readFileSync(`${__dirname}/views/index.html`, "utf8")
      .replace(/{{host}}/g, host)
  ) && res.end();
});

const host = "https://s0sse.link";

const log = req => {
  const _source = +req.originalUrl.split("/")[1];
  //console log
  console.debug({
    proto: JSON.parse(req.headers["cf-visitor"]).scheme,
    ua: req.get("User-Agent"),
    type: getType(req),
    IP: req.headers["cf-connecting-ip"]
      ? req.headers["cf-connecting-ip"]
      : req.ip,
    url: `${JSON.parse(req.headers["cf-visitor"]).scheme}://${
      host.split("//")[1]
    }${req.originalUrl}`, //`${req.protocol}://${req.headers.host}${req.originalUrl}`
    referrer: req.headers["referrer"] || "",
    source: _source !== NaN ? _source : ""
  });
  //matomo log
  m.track({
    token_auth: process.env.MATOMO_TOKEN,
    cip: req.headers["cf-connecting-ip"]
      ? req.headers["cf-connecting-ip"]
      : req.ip,
    url: `${JSON.parse(req.headers["cf-visitor"]).scheme}://${
      host.split("//")[1]
    }${req.originalUrl}`,
    action_name: `${req.originalUrl} [${getType(req)} (from log)]`,
    ua: `${req.get("User-Agent")}`
  });
};

app.post("/welcome", (req, res) => {
  log(req);
  res.json("yo");
});

class soos {
  constructor(obj) {
    this.web = obj.web || "";
    (this.file = obj.file || ""),
      (this.active = obj.active || Buffer.alloc(1, 0)), //Buffer.equals to compare buffers!
      (this.token = obj.token || ""),
      (this.sid = Math.floor(new Date().valueOf() * Math.random()));
  }
}

//save post
app.post("/api/add", async (req, res) => {
  const reqToken = await tokenResolve(req.body.token);
  if (reqToken) {
    if (req.body.file) {
      const existing = await getSourceDupe(req.body.file);
      if (!existing) {
        const _NEW = new soos({
          web: req.body.web.trim(),
          file: req.body.file.trim(),
          token: reqToken
        });

        while (await getSource(_NEW.sid))
          _NEW.sid = Math.floor(new Date().valueOf() * Math.random());

        const conn = await sourcePool.getConnection(),
          _ = await conn.insert(process.env.DB_SOURCES_TABL, _NEW),
          __ = await conn.done();

        $.set(`SOOS_${_NEW.sid}`, _NEW);
        res.json({
          status: "ok",
          msg: "Soße hinzugefügt.",
          data: `http://${host.split("//")[1]}/${_NEW.sid}`
        });
      } else res.json({ status: "nok", msg: "Quelldatei bereits eingefügt!" });
    } else res.json({ status: "nok", msg: "Quelldatei darf nicht leer sein!" });
  } else res.json({ status: "nok", msg: "inkorrektes Token!" });
});

//save post
app.patch("/api/edit", async (req, res) => {
  const ID = req.body.id;
  const reqToken = await tokenResolve(req.body.token);
  if (ID) {
    if (reqToken) {
      const SOOS = $.get(`SOOS_${ID}`) || (await getSource(ID));
      if (SOOS) {
        if (await tokenBelong(reqToken, SOOS)) {
          SOOS.active = Buffer.alloc(1, 1);
          SOOS.web = req.body.web.trim();
          const conn = await sourcePool.getConnection(),
            _ = conn.upsert(process.env.DB_SOURCES_TABL, SOOS),
            __ = conn.done();

          $.set(`SOOS_${ID}`, SOOS);

          res.json({ status: "ok", msg: "Soße aktualisiert." });
        } else
          res.json({
            status: "nok",
            msg: "Token & Soße passen nicht zusammen!"
          });
      } else res.json({ status: "nok", msg: "soße nicht gefunden!" });
    } else res.json({ status: "nok", msg: "inkorrektes Token!" });
  } else res.json({ status: "nok", msg: "keine Soßen-ID angegeben!" });
});

//delete id
app.delete("/api/edit", async (req, res) => {
  const ID = req.body.id;
  const reqToken = await tokenResolve(req.body.token);
  if (ID) {
    if (reqToken) {
      const SOOS = $.get(`SOOS_${ID}`) || (await getSource(ID));
      if (SOOS) {
        if (await tokenBelong(reqToken, SOOS)) {
          SOOS.active = Buffer.alloc(1, 0);
          const conn = await sourcePool.getConnection(),
            _ = conn.upsert(process.env.DB_SOURCES_TABL, SOOS),
            __ = conn.done();
          $.set(`SOOS_${ID}`, SOOS);
          res.json({ status: "ok", msg: "Soße deaktiviert." });
        } else
          res.json({
            status: "nok",
            msg: "Token & Soße passen nicht zusammen!"
          });
      } else res.json({ status: "nok", msg: "soße nicht gefunden!" });
    } else res.json({ status: "nok", msg: "Inkorrektes token!" });
  } else res.json({ status: "nok", msg: "keine Soßen-ID angegeben!" });
  res.end();
});

//tmpupload file and...
app.post("/api/up", async (req, res) => {
  const reqToken = await tokenResolve(req.body.token);

  if (reqToken) {
    if (req.body.file) {
      const existing = await getSourceDupe(req.body.file);

      const tmpID = Math.floor(new Date().valueOf() * Math.random());

      fs.writeFile(
        `${__dirname}/tmp/${tmpID}.${req.body.ending}`,
        req.body.file.split(";base64,").pop(),
        { encoding: "base64" },
        err => {
          !err
            ? res.json({
                status: "ok",
                msg: "Datei hochgeladen.",
                data: `http://${host.split("//")[1]}/tmp/${tmpID}.${
                  req.body.ending
                }`
              })
            : res.json({ status: "nok", msg: JSON.stringify(err) });
        }
      );
    } else res.json({ status: "nok", msg: "Datei fehlt!" });
  } else res.json({ status: "nok", msg: "Inkorrektes Token!" });
});

//...get this file lol
app.get("/tmp/:file", async (req, res) => {
  const tmpFile = req.params.file;

  if (isUpload(req)) {
    if (tmpFile) {
      const filePath = `${__dirname}/tmp/${tmpFile}`;
      if (fs.existsSync(filePath)) {
        //serve, then delete file
        try {
          res.sendFile(
            filePath,
            getType(req) === "upload" &&
              setTimeout(() => fs.unlinkSync(filePath), 60 * 1000 * 2)
          ); //delete in 2min
        } catch (e) {
          res.redirect("/500");
        }
      } else res.redirect("/404");
    } else res.redirect("/400");
  } else res.redirect("/204");
});

{
  const uuidv4 = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  app.post("/api/verify", async (req, res) => {
    const conn = await tokenPool.getConnection();
    const userQuery = await conn.query(
      `select * from ${process.env.DB_USERS_TABL} where username = "${mysqape(
        req.body.user
      )}";`
    );

    fetch(
      //`https://pr0gramm.com/api/items/get?likes=${req.body.user}&older=${req
      //  .body.post + 1}`
      `https://pr0gramm.com/api/items/get?older=${req.body.post +
        1}&flags=1&user=${req.body.user}&collection=favoriten`
    )
      .then(res => res.json())
      .then(async json => {
        console.log(json);

        if (json.error && json.error === "notPublic")
          res.json({
            status: "nok",
            msg: "Du hast die Favs nicht öffentlich gemacht..."
          });
        //post was faved
        else if (json.items[0].id === req.body.post) {
          let token;
          while ((token === void 0) | ((await tokenResolve(token)) !== void 0))
            token = uuidv4();

          if (userQuery.length) {
            const _ = conn.upsert(process.env.DB_USERS_TABL, {
                id: userQuery[0].id,
                token
              }),
              __ = conn.done();

            console.log(`New token for user ${req.body.user} was generated!`);

            res.json({
              status: "ok",
              msg:
                "Neues Token erfolgreich gespeichert.. \nKannst Favs wieder privat machen und unfavven:",
              data: token
            });
          } else {
            const _ = conn.insert(process.env.DB_USERS_TABL, {
                token,
                username: req.body.user
              }),
              __ = conn.done();
            res.json({
              status: "ok",
              msg:
                "Token erfolgreich angelegt. \nKannst Favs wieder privat machen und unfavven:",
              data: token
            });
          }
        } else
          res.json({
            status: "nok",
            msg: "post wurde nicht favoritisiert!"
          });
      });
  });
}

app.get("/api/resolve/:token", async (req, res) => {
  if (req.params.token) {
    const resolved = await tokenResolve(req.params.token);
    if (resolved) {
      res.json({ status: "ok", msg: "Token ok." });
    } else res.json({ status: "nok", msg: "Token invalid!" });
  } else res.json({ status: "nok", msg: "kein Token!" });
  res.end();
});

app.get("/api/randompost", async (req, res) => {
  const action = () => {
    const id = Math.floor(Math.random() * 3000000) + 1;
    fetch(`https://pr0gramm.com/api/items/info?itemId=${id}`)
      .then(_res => _res.json())
      .then(json => {
        if (
          json.tags.length === 0 || //selfdeleted
          (json.tags.length === 1 && json.tags[0].tag === "text") || //selfdeleted again
          json.tags.find(x => ["nsfw", "nsfp", "nsfl"].includes(x.tag)) //bad filters
        ) {
          //no selfdelted of bad filters
          action();
          console.log(`bad id ${id}`);
        } else res.json({ status: "ok", data: id });
      });
  };
  action();
});

//CONCEPT4 ✓
//-> /x
app.all("/:id", async (req, res) => {
  const ID = !isNaN(req.params.id) ? req.params.id : void 0;

  let SOOS = $.get(`SOOS_${ID}`);

  if (ID && !SOOS) SOOS = $.set(`SOOS_${ID}`, await getSource(ID));

  //self request via edit-preflight
  if (isSelf(req)) {
    return res.json(
      SOOS && SOOS.active[0] === 1
        ? { status: "ok", url: SOOS.web }
        : { status: "nok", msg: `soße ${ID} nicht gefunden!` }
    );
  }
  //activate source after upload only
  if (ID && SOOS && isUpload(req)) {
    SOOS.active = Buffer.alloc(1, 1);
    const conn = await sourcePool.getConnection(),
      _ = await conn.upsert(process.env.DB_SOURCES_TABL, SOOS),
      __ = await conn.done();

    $.set(`SOOS_${ID}`, SOOS);
  }

  ID && SOOS && SOOS.active[0] && SOOS.web
    ? [res.redirect(isUpload(req) ? SOOS.file : SOOS.web)] //link found, redirect to link
    : //entry not found, check if path is number...
      res.write(
        fs
          .readFileSync(`${__dirname}/views/index.html`, "utf8")
          .replace(/{{host}}/g, host)
          .replace(
            "{{from}}",
            `/${SOOS && !SOOS.web ? 302 : isNaN(+ID) ? 204 : 404}`
          ) //if path is number but not found, notify client about 404, else about invalid serverside path
      ) && res.end();
  log(req);
});

app.get("/*", (req, res) => {
  res.write(
    fs
      .readFileSync(`${__dirname}/views/index.html`, "utf8")
      .replace(/{{host}}/g, host)
      .replace("{{from}}", "/400") //how did we get here lol
  ) && res.end();
});

const sourcePool = $.set(
    "sourcePool",
    mySqlEasier.createPool({
      host: process.env.DB_SOURCES_HOST,
      user: process.env.DB_SOURCES_USER,
      password: process.env.DB_SOURCES_PASS,
      database: process.env.DB_SOURCES_NAME
    })
  ),
  getSources = async () =>
    new Promise(async (resolve, reject) => {
      let data;
      const conn = await sourcePool.getConnection();
      conn.getAll("sources").then(_data => {
        data = _data;
        data.sort((a, b) => {
          return a.created - b.created || `${a}`.localeCompare(b);
        });
        console.log("got data.");
        return resolve(data);
      });
      conn.done();
    });

//resolve token to ID
const tokenResolve = async token => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_USERS_TABL} where token = "${mysqape(
        token
      )}";`
    ),
    _ = conn.done();
  return data.length ? data[0].id : void 0;
};

//does a token belong to src
const tokenBelong = async (token, soos) => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where id = ${
        soos.id
      } AND token = "${mysqape(token)}";`
    ),
    _ = conn.done();
  if (data.length) return true;
  else return false;
};

const getSource = async id => {
  if (!id) return void 0;
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where sid = ${mysqape(id)};`
    ),
    _ = conn.done();
  if (data.length) return data[0];
  else return void 0;
};

const getSourceDupe = async direct => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where file = "${mysqape(
        direct
      )}"`
    ),
    _ = conn.done();
  if (data.length) return data[0];
  else return void 0;
};

const tokenPool = $.set(
    "tokenPool",
    mySqlEasier.createPool({
      host: process.env.DB_USERS_HOST,
      user: process.env.DB_USERS_USER,
      password: process.env.DB_USERS_PASS,
      database: process.env.DB_USERS_NAME
    })
  ),
  getTOKENS = async () =>
    new Promise(async (resolve, reject) => {
      let data;
      const conn = await tokenPool.getConnection();
      conn.getAll("TOKENS").then(_data => {
        data = _data;
        data.sort((a, b) => {
          return a.name.length - b.name.length || a.localeCompare(b);
        });
        console.log("got data.");
        return resolve(data);
      });
      conn.done();
    });

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log(
    `Soßenapp läuft auf port ${listener.address().port} (app is running)`
  );
});
