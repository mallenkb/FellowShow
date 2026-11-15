// Fills the Identify card from its URL. Kept as a separate file because the
// app's content security policy blocks inline scripts.
const params = new URLSearchParams(window.location.search)
document.getElementById("title").textContent = params.get("title") ?? ""
document.getElementById("detail").textContent = params.get("detail") ?? ""
