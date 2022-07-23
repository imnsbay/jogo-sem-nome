import fs from "fs";

export function readUsers() {
  let users;

  fs.readFile("./users.json", "utf-8", async (err, data) => {
    if (err) {
      throw err;
    }

    try {
      users = JSON.parse(data);
    } catch (err) {
      console.log("Error parsing JSON string:", err);
    }

    console.log(users);
    console.log(typeof users);
    return users;
  });
}

export function writeUsers(path, users) {
  const jsonString = JSON.stringify(users);

  fs.writeFile(path, jsonString, (err) => {
    if (err) {
      console.log("Erro ao escrever arquivo no disco: " + err);
    } else {
      console.log("Arquivo salvo com sucesso!");
    }
  });
}
