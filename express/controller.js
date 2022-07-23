import { log } from "console";
import fs from "fs";

export function loginController(req, res) {
  let users = {};
  users = readUsers("./users.json");
}

export function registerController(req, res) {
  const username = req.params.username;
  const email = req.params.email;
  const password = req.params.password;

  readUsers().then((users) => {
    if (!users[username]) {
      users[username] = {
        username,
        email,
        password,
      };
    } else {
      console.log(username + " já cadastrado");
    }

    writeUsers(users);

    res.redirect("/");
  });
}

export function readUsers() {
  return new Promise((resolve, reject) => {
    fs.readFile("./users.json", "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

export function writeUsers(users) {
  const jsonString = JSON.stringify(users);

  fs.writeFile("./users.json", jsonString, (err) => {
    if (err) {
      console.log("Erro ao escrever arquivo no disco: " + err);
    }
  });
}
