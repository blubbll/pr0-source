//copy by Blu, Kau, Nikei
const //selectors
  $ = document.querySelector.bind(document),
  $$ = document.querySelectorAll.bind(document);

console.clear();

const app = {
  api: `${location.href
    .split("/")
    .slice(0, 3)
    .join("/")}/api`
};
{
  //set active view
  const setActiveView = path => {
    console.debug("active view was set to", path);

    //update document title
    document.title = `${app.otitle}${
      path === "/" ? "" : path.replace("/", " – ")
    }`;

    //set currently active view
    for (const _view of $$("view")) {
      _view.setAttribute(
        "active",
        _view.getAttribute("path") === path ? true : false
      );
    }

    //show noauth  display
    $("#noauth").style.display =
      $("page[auth=false]") &&
      isNaN(path.slice(1)) &&
      !["/", "/auth"].includes(path)
        ? "block"
        : "none";

    //path initialization
    switch (path) {
      case "/add":
        {
          $("input[name=addDirect]").value = "";
          $("input[name=addWeb]").value = "";
        }
        break;
      case "/edit":
        {
          $("input[name=editID]").value = "";
          $("input[name=editWeb]").value = "";
          $("input[name=editWeb]").disabled = true;
        }
        break;

      case "/up":
        {
          $("input[name=upFile]").value = "";
        }
        break;

      case "/auth":
        {
          $("input[name=appToken]").value = app.token || "";
        }
        break;
    }

    //log path
    fetch(path, { method: "HEAD" });
  };

  //go to auth from authme button
  app.gotoAuth = () => {
    const p = "/auth";
    setActiveView(p), syncNavlinks(p), history.pushState(null, null, p);
  };

  //upload new file
  app.up = () => {
    const file = $("input[name=upFile]").files[0];

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      fetch(`${app.api}/up`, {
        body: JSON.stringify({
          token: app.token,
          file: reader.result,
          ending: file.name.split(".").pop(),
          type: file.type
        }),
        headers: {
          "CONTENT-TYPE": "application/json" //wichtig lol
        },
        method: "POST"
      })
        .then(res => res.json())
        .then(json => {
          if (json.status === "ok") {
            //navigation magic
            const newPath = "/add";
            history.pushState(null, null, newPath),
              setActiveView(newPath),
              syncNavlinks(newPath);
            setTimeout(() => {
              ($("input[name=addDirect]").value = json.data),
                $("input[name=addWeb]").focus();
            });
          } else alert(json.msg);

          reader.onerror = error => {
            alert(error);
            console.error(error);
          };

          //fetch()
        });
    };
    return false; //form
  };

  //add new source
  app.add = () => {
    fetch(`${app.api}/add`, {
      body: JSON.stringify({
        token: app.token,
        file: $("input[name=addDirect]").value,
        web: $("input[name=addWeb]").value
      }),
      headers: {
        "CONTENT-TYPE": "application/json" //wichtig lol
      },
      method: "POST"
    })
      .then(res => res.json())
      .then(json => {
        if (json.status === "ok") {
          prompt(json.msg, json.data);
        } else alert(json.msg);
      });
    return false; //form
  };

  //edit-preflight (triggers on idField-valuechange)
  app.gedit = elem => {
    const fill = url => {};
    //fix domain to id
    if (elem.value.includes("//")) elem.value = +elem.value.split("/")[3];
    const f = fetch(`/${elem.value}`, { headers: { self: true } })
      .then(res => res.json())
      .then(json => {
        if (json.status === "ok") {
          $("input[name=editWeb]").disabled = false;
          $("input[name=editWeb]").focus();
          $("input[name=editWeb]").value = json.url || "";
        } else {
          alert(json.msg);
          $("input[name=editID]").focus() && $("input[name=editID]").select();
        }
      });
  };

  //edit source
  app.edit = () => {
    fetch(`${app.api}/edit`, {
      body: JSON.stringify({
        id: $("input[name=editID]").value,
        token: app.token,
        web: $("input[name=editWeb]").value
      }),
      headers: {
        "CONTENT-TYPE": "application/json" //wichtig lol
      },
      method: "PATCH"
    })
      .then(res => res.json())
      .then(json => {
        if (json.status === "ok") {
          alert(json.msg);
        } else alert(json.msg);
      });
    return false; //form
  };

  //disable a source
  app.checkDelete = () => {
    if (confirm("echt?")) {
      fetch(`${app.api}/edit`, {
        body: JSON.stringify({
          id: $("input[name=editID]").value,
          token: app.token
        }),
        headers: {
          "CONTENT-TYPE": "application/json" //wichtig lol
        },
        method: "DELETE"
      })
        .then(res => res.json())
        .then(json => {
          if (json.status === "ok") {
            alert(json.msg);
          } else alert(json.msg);
        });
    }
    return false; //form
  };

  //update token
  app.updateToken = (skipcheck, tok) => {
    const update = tok => {
      app.token = tok;
      localStorage.setItem("token", tok);
      $("page").setAttribute("auth", true);
    };
    if (skipcheck) {
      update(tok);
      $("input[name=appToken]").value = tok;
    } else {
      const resolvTok = $("input[name=appToken]").value;
      if (resolvTok) {
        fetch(`${app.api}/resolve/${resolvTok}`, {
          headers: {
            "CONTENT-TYPE": "application/json" //wichtig lol
          },
          method: "GET"
        })
          .then(res => res.json())
          .then(json => {
            if (json.status === "ok") {
              update(resolvTok);
              alert("Token geändert.");
            } else {
              updateTokIcon(false);
              alert("invalides Token!");
            }
          });
      } else {
        alert("no token!");
        updateTokIcon(false);
      }
    }
    return false; //form
  };

  //update token
  app.getToken = () => {
    const next = "\nDanach auf OK klicken für den nächsten Schritt.";
    const user = prompt(
        "Bitte pr0-Nutzernamen eingeben, um\nden Verknüfungsvorgang zu starten." +
          next
      ),
      post = "https://pr0gramm.com/new/43",
      sett = "https://pr0gramm.com/settings/site";
    prompt(
      "Als nächstes musst du einen bestimmten Post favoritisieren.\nDrück OK um loszulegen.",
      post
    );
    Object.assign(document.createElement("a"), {
      target: "_blank",
      href: post
    }).click();

    prompt(
      "Favoriten auf 'sind sichtbar für JEDEN' stellen" +
        "Soweit alles bereit ist, klicke erneut auf OK, um dein Token zu erhalten.",
      sett
    );

    if (user)
      fetch(`${app.api}/verify`, {
        headers: {
          "CONTENT-TYPE": "application/json" //wichtig lol
        },
        method: "POST",
        body: JSON.stringify({
          user: user
        })
      })
        .then(res => res.json())
        .then(json => {
          if (json.status === "ok") {
            app.updateToken(true, json.data);
            updateTokIcon(true);
            prompt(json.msg, post);
          } else {
            alert(json.msg);
          }
        });
    else alert("Nutzername fehlt.");

    return false; //form*/
  };

  //update token
  app.clearToken = () => {
    const next = "\nDanach auf OK klicken für den nächsten Schritt.";
    const user = prompt(
        "Bitte pr0-Nutzernamen eingeben, um\nden Entknüpfungsvorgang zu starten." +
          next
      ),
      post = "https://pr0gramm.com/new/70",
      sett = "https://pr0gramm.com/settings/site";
    alert(
      "Als nächstes musst du einen bestimmten Post favorisieren.\nDrück OK um loszulegen."
    );
    Object.assign(document.createElement("a"), {
      target: "_blank",
      href: post
    }).click();

    prompt(
      "Favoriten auf 'sind sichtbar für JEDEN' stellen" +
        "Soweit alles bereit ist, klicke erneut auf OK, um dein Token zu erhalten.",
      sett
    );

    if (user)
      fetch(`${app.api}/unverify`, {
        headers: {
          "CONTENT-TYPE": "application/json" //wichtig lol
        },
        method: "POST",
        body: JSON.stringify({
          user: user
        })
      })
        .then(res => res.json())
        .then(json => {
          if (json.status === "ok") {
            app.updateToken(true, json.data);
            updateTokIcon(true);
            prompt(json.msg, post);
          } else {
            alert(json.msg);
          }
        });
    else alert("Nutzername fehlt.");

    return false; //form*/
  };

  //sync active nav link styling
  const syncNavlinks = href => {
    for (const _link of $$("header-content navlink")) {
      _link.setAttribute(
        "active",
        _link.getAttribute("href") === href ? true : false
      );
    }
  };
  //get current path
  const getPath = () => {
    const splut = `/${location.href.split("/")[3].split(":")[0]}`;
    return $(`view[path="${splut}"]`) //does path exist as view
      ? splut //go to that view
      : $("meta[name=from]") //else get server->client path
          .getAttribute("value")
          .replace("{{from}}", "") ||
          splut ||
          "/";
  };

  const updateTokIcon = state => {
    if (state) {
      $("#tok").style.display = "inline-block";
      $("#notok").style.display = "none";
    } else {
      $("#notok").style.display = "inline-block";
      $("#tok").style.display = "none";
    }
  };

  window.onload = () => {
    {
      app.otitle = document.title;
      //lil welcome ping
      fetch("/welcome", { method: "POST" });
      const path = getPath();
      console.debug("Coming from path", path);
      if ($(`view[path="/${location.href.split("/")[3]}"]`)) {
        app.path = path;
      }

      if (localStorage.getItem("token")) {
        fetch(`${app.api}/resolve/${localStorage.getItem("token")}`, {
          headers: {
            "CONTENT-TYPE": "application/json" //wichtig lol
          },
          method: "GET"
        })
          .then(res => res.json())
          .then(json => {
            if (json.status === "ok") {
              app.updateToken(true, localStorage.getItem("token"));
              updateTokIcon(true);
            } else updateTokIcon(false);

            setActiveView(path);
            syncNavlinks(path);
          });
      } else {
        $("page").setAttribute("auth", false);
        updateTokIcon(false), setActiveView(path);
      }
    }
  };

  //update paths when changing history clientside
  window.onpopstate = event => {
    const path = getPath();
    setActiveView(path);
    app.path = path;
  };

  //click-navigation on headlinks
  for (const link of $$("navlink")) {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");

      //no reloading
      if (app.path === href) return;
      console.debug("Navigating to path", href);

      //update to path if exist
      if ($(`view[path="${href}"]`)) {
        setActiveView(`/${href.split("/")[1]}`);
        history.pushState(null, null, href);
        app.path = href;
      } else {
        console.warn("Couldn't navigate to path", href);

        history.pushState(null, null, href);
        location.reload(true);
      }

      //update navlink styling to reflect current navigation
      syncNavlinks(href);
    });
  }
}
