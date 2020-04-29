//copy by Blu, Kau, Nikei
const //selectors
  $ = document.querySelector.bind(document),
  $$ = document.querySelectorAll.bind(document);

console.clear();
const app = {};
{
  const setActiveBlock = id => {
    for (const _block of $$("block")) {
      _block.setAttribute(
        "active",
        _block.getAttribute("id") === id ? true : false
      );
    }
  };
  for (const link of $$("navlink")) {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");

      if (app.route === href) return;
      else
        [
          (app.route = href),
          console.debug({ "new route": href }),
          history.pushState(null, null, href)
        ];

      for (const _link of $$("navlink")) {
        _link.setAttribute(
          "active",
          _link.getAttribute("href") === href ? true : false
        );
      }

      switch (href) {
        case "/":
          {
            setActiveBlock("start");
          }
          break;
        default: {
          setActiveBlock(href.split("/")[1]);
        }
      }
    });
  }
  //default / server->client routing
  setTimeout(() =>
    setActiveBlock(
      $("meta[name=from]")
        .getAttribute("value")
        .replace("{{from}}", "") ||
        location.href.split("/")[3] ||
        "start"
    )
  );
}
