const registerPage = document.getElementById("register-page");
const inputUsername = document.getElementById("username");
const inputPassword = document.getElementById("password");
const inputEmail = document.getElementById("email");
const buttonRegister = document.getElementById("button-register");
buttonRegister.disabled = true;

registerPage.addEventListener("keyup", (e) => {
  const usernameText = inputUsername.value;
  const passwordText = inputPassword.value;
  const emailText = inputEmail.value;

  if (
    usernameText.length > 0 &&
    passwordText.length > 0 &&
    emailText.length > 0 &&
    emailText.includes("@") &&
    emailText.includes(".com")
  ) {
    buttonRegister.disabled = false;
  } else {
    buttonRegister.disabled = true;
  }
});

buttonRegister.addEventListener("click", (e) => {
  window.location.href =
    "http://localhost:4040/register/" +
    inputUsername.value +
    "/" +
    inputEmail.value +
    "/" +
    inputPassword.value;

  console.log("clicou no botao");
});
